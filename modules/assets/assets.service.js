"use strict";

const { Op } = require("sequelize");
const { Asset, LedgerAccount, JournalEntry, JournalEntryLine, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const jeSvc   = require("../journalEntries/journalEntries.service");
const fLedger = require("../shared/financialLedger.service");

const getAll = async (store_id, filters = {}) => {
  const { page = 1, limit = 20, search, category, status } = filters;
  const where = {};
  if (store_id != null) where.store_id = store_id;
  if (category) where.category = category;
  if (status)   where.status   = status;
  if (search)   where.name     = { [Op.like]: `%${search}%` };

  const { count, rows } = await Asset.findAndCountAll({
    where,
    order: [["purchase_date", "DESC"], ["id", "DESC"]],
    limit:  parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return {
    total:       count,
    page:        parseInt(page),
    limit:       parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data:        rows,
  };
};

const getById = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const asset = await Asset.findOne({ where });
  if (!asset) throw new AppError("Asset not found", 404);
  return asset;
};

const create = async (data, user_id) => {
  const { store_id, name, category, purchase_date, purchase_value, depreciation_rate, notes, payment_method } = data;
  const bookValue = parseFloat(purchase_value || 0);

  return sequelize.transaction(async (t) => {
    const asset = await Asset.create(
      {
        store_id,
        name,
        category:                 category          || null,
        purchase_date:            purchase_date     || null,
        purchase_value:           bookValue,
        depreciation_rate:        parseFloat(depreciation_rate || 0),
        accumulated_depreciation: 0,
        current_book_value:       bookValue,
        notes:      notes || null,
        status:     "Active",
        created_by: user_id,
      },
      { transaction: t },
    );

    // Capitalization JE — only when there is a purchase value
    if (bookValue > 0) {
      // Credit side: Cash/Bank if paid immediately, Default Creditor if on account
      const creditAccount = payment_method
        ? fLedger.paymentMethodToMappingKey(payment_method)
        : "default_creditor";

      await fLedger.postNamedJE({
        store_id,
        reference_type: "asset_purchase",
        reference_id:   asset.id,
        date:           purchase_date || new Date(),
        description:    `Asset capitalized: ${name}`,
        namedLines: [
          { mappingKey: "fixed_asset",   debit: bookValue, credit: 0 },
          { mappingKey: creditAccount,   debit: 0,         credit: bookValue },
        ],
        user_id,
      }, t);
    }

    return asset;
  });
};

const update = async (id, data, store_id) => {
  const asset = await getById(id, store_id);
  const { name, category, purchase_date, purchase_value, depreciation_rate, notes, status } = data;
  const bookValue = purchase_value !== undefined ? parseFloat(purchase_value) : parseFloat(asset.current_book_value);
  await asset.update({ name, category, purchase_date, purchase_value, depreciation_rate, notes, status, current_book_value: bookValue });
  return getById(id, store_id);
};

const postDepreciation = async (id, { amount, date }, user_id, store_id) => {
  const asset  = await getById(id, store_id);
  if (amount === undefined || amount === null || isNaN(parseFloat(amount)))
    throw new AppError("amount is required and must be a number", 400);
  const depAmt = parseFloat(amount);
  if (depAmt <= 0) throw new AppError("Depreciation amount must be positive", 400);

  // Require the Fixed Asset account — no random fallback
  const [deprAcc, assetAcc] = await Promise.all([
    jeSvc.findAccountByName(store_id, "Depreciation"),
    LedgerAccount.findOne({ where: { store_id, name: "Fixed Asset", is_active: 1 } }),
  ]);
  if (!assetAcc) {
    throw new AppError(
      "'Fixed Asset' ledger account not found. Run the backfill script or add it in Chart of Accounts.",
      404,
    );
  }

  return sequelize.transaction(async (t) => {
    const bookValue = parseFloat(asset.current_book_value);
    if (depAmt > bookValue) {
      throw new AppError(
        `Depreciation (${depAmt}) exceeds current book value (${bookValue}) for asset "${asset.name}"`,
        400,
      );
    }
    const newAccumulated = parseFloat(asset.accumulated_depreciation) + depAmt;
    const newBookValue   = bookValue - depAmt;

    await asset.update(
      { accumulated_depreciation: newAccumulated, current_book_value: newBookValue },
      { transaction: t },
    );

    await jeSvc.postJournalEntry(
      {
        store_id,
        date:           date || new Date(),
        description:    `Depreciation on ${asset.name}`,
        reference_type: "asset_depreciation",
        reference_id:   asset.id,
        is_manual:      0,
        created_by:     user_id,
        lines: [
          { ledger_account_id: deprAcc.id,  debit: depAmt, credit: 0,      description: `Depreciation: ${asset.name}` },
          { ledger_account_id: assetAcc.id, debit: 0,      credit: depAmt, description: `Book value reduction: ${asset.name}` },
        ],
      },
      t,
    );

    return getById(id, store_id);
  });
};

const deleteAsset = async (id, store_id) => {
  const asset = await Asset.findOne({ where: { id, store_id } });
  if (!asset) throw new AppError("Asset not found", 404);

  await sequelize.transaction(async (t) => {

    const oldJes = await JournalEntry.findAll({
      where: { reference_type: { [Op.in]: ["asset_purchase", "asset_depreciation"] }, reference_id: id },
      attributes: ["id"],
      transaction: t,
    });
    if (oldJes.length) {
      const jeIds = oldJes.map((je) => je.id);
      await JournalEntryLine.destroy({ where: { journal_entry_id: jeIds }, transaction: t });
      await JournalEntry.destroy({ where: { id: jeIds }, transaction: t });
    }
    await asset.destroy({ transaction: t });
  });

  return { message: "Asset deleted successfully" };
};

module.exports = { getAll, getById, create, update, postDepreciation, deleteAsset };
