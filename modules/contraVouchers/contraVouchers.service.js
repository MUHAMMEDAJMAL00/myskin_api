"use strict";

const { Op } = require("sequelize");
const { ContraVoucher, JournalEntry, LedgerAccount, User, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const jeSvc  = require("../journalEntries/journalEntries.service");
const ledger = require("../accountLedger/accountLedger.service");

const _generateVoucherNumber = async (store_id, date, t = null) => {
  const d = typeof date === "string" ? date : (date instanceof Date ? date.toISOString() : new Date().toISOString());
  const month  = d.slice(0, 7).replace("-", "");
  const prefix = `CV-${month}-`;
  const opts   = t ? { transaction: t, lock: t.LOCK.UPDATE } : {};
  const last   = await ContraVoucher.findOne({
    where: { store_id, voucher_number: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
    attributes: ["voucher_number"],
    ...opts,
  });
  let seq = 1;
  if (last && last.voucher_number) {
    const parts = last.voucher_number.split("-");
    seq = parseInt(parts[parts.length - 1] || 0, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
};

const getAll = async (store_id, filters = {}) => {
  const { page = 1, limit = 20, from, to, search } = filters;
  const where = {};
  if (store_id != null) where.store_id = store_id;
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to)   where.date[Op.lte] = to;
  }
  if (search) {
    where[Op.or] = [
      { voucher_number: { [Op.like]: `%${search}%` } },
      { notes:          { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await ContraVoucher.findAndCountAll({
    where,
    include: [
      { model: LedgerAccount, as: "from_account", attributes: ["id", "name"] },
      { model: LedgerAccount, as: "to_account",   attributes: ["id", "name"] },
    ],
    order: [["date", "DESC"], ["id", "DESC"]],
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
  const voucher = await ContraVoucher.findOne({
    where,
    include: [
      { model: LedgerAccount, as: "from_account", attributes: ["id", "name"] },
      { model: LedgerAccount, as: "to_account",   attributes: ["id", "name"] },
      { model: User,          as: "CreatedBy",     attributes: ["id", "name"] },
    ],
  });
  if (!voucher) throw new AppError("Contra voucher not found", 404);
  return voucher;
};

const create = async (data, user_id) => {
  const { store_id, date, from_account_id, to_account_id, amount, payment_mode, notes } = data;

  const [fromAcc, toAcc] = await Promise.all([
    LedgerAccount.findOne({ where: { id: from_account_id, store_id, is_active: 1 } }),
    LedgerAccount.findOne({ where: { id: to_account_id,   store_id, is_active: 1 } }),
  ]);
  if (!fromAcc) throw new AppError("From account not found", 404);
  if (!toAcc)   throw new AppError("To account not found",   404);
  if (from_account_id === to_account_id) throw new AppError("From and To accounts must be different", 400);

  const amt = parseFloat(amount);

  return sequelize.transaction(async (t) => {
    const voucher_number = await _generateVoucherNumber(store_id, date, t);
    const voucher = await ContraVoucher.create(
      {
        store_id,
        voucher_number,
        date,
        from_account_id,
        to_account_id,
        amount: amt,
        payment_mode: payment_mode || null,
        notes:        notes        || null,
        created_by:   user_id,
      },
      { transaction: t },
    );

    await jeSvc.postJournalEntry(
      {
        store_id,
        date,
        description:    `Contra Voucher ${voucher_number}: ${fromAcc.name} → ${toAcc.name}`,
        reference_type: "contra_voucher",
        reference_id:   voucher.id,
        is_manual:      0,
        created_by:     user_id,
        lines: [
          { ledger_account_id: to_account_id,   debit: amt, credit: 0,   description: `Transfer in from ${fromAcc.name}` },
          { ledger_account_id: from_account_id, debit: 0,   credit: amt, description: `Transfer out to ${toAcc.name}`   },
        ],
      },
      t,
    );

    // Operational sub-ledger mirrors the transfer
    const isBank = (name) => {
      const n = name.toLowerCase();
      if (/charges|fees|interest|expense|loan/.test(n)) return false;
      return n.includes("/") || n.includes("bank");
    };
    const toParty   = isBank(toAcc.name)   ? "bank" : "cash";
    const fromParty = isBank(fromAcc.name) ? "bank" : "cash";
    await ledger.writeEntries([
      {
        store_id, party_type: toParty,
        transaction_type: "contra_transfer", reference_type: "contra_voucher",
        reference_id: voucher.id, debit: amt, credit: 0,
        description: `Contra: transfer in from ${fromAcc.name}`,
        transaction_date: date || new Date(), created_by: user_id,
      },
      {
        store_id, party_type: fromParty,
        transaction_type: "contra_transfer", reference_type: "contra_voucher",
        reference_id: voucher.id, debit: 0, credit: amt,
        description: `Contra: transfer out to ${toAcc.name}`,
        transaction_date: date || new Date(), created_by: user_id,
      },
    ], t);

    return voucher;
  });
};

const cancel = async (id, store_id, user_id) => {
  const voucher = await getById(id, store_id);

  const alreadyCancelled = await JournalEntry.findOne({
    where: { reference_type: "contra_voucher_reversal", reference_id: id, store_id },
  });
  if (alreadyCancelled) throw new AppError("Contra voucher has already been cancelled", 409);

  const amt       = parseFloat(voucher.amount);
  const fromAccId = voucher.from_account_id;
  const toAccId   = voucher.to_account_id;

  return sequelize.transaction(async (t) => {
    await jeSvc.postJournalEntry(
      {
        store_id,
        date:           new Date(),
        description:    `Reversal of ${voucher.voucher_number}`,
        reference_type: "contra_voucher_reversal",
        reference_id:   voucher.id,
        is_manual:      0,
        created_by:     user_id,
        lines: [
          { ledger_account_id: fromAccId, debit: amt, credit: 0,   description: `Reversal: transfer back from ${voucher.to_account ? voucher.to_account.name : toAccId}` },
          { ledger_account_id: toAccId,   debit: 0,   credit: amt, description: `Reversal: refund to ${voucher.from_account ? voucher.from_account.name : fromAccId}` },
        ],
      },
      t,
    );

    const toParty   = /bank/i.test(voucher.to_account ? voucher.to_account.name : "")   ? "bank" : "cash";
    const fromParty = /bank/i.test(voucher.from_account ? voucher.from_account.name : "") ? "bank" : "cash";
    await ledger.writeEntries([
      {
        store_id, party_type: fromParty,
        transaction_type: "contra_cancel", reference_type: "contra_voucher",
        reference_id: voucher.id, debit: amt, credit: 0,
        description: `Contra reversal: transfer back to ${voucher.from_account ? voucher.from_account.name : fromAccId}`,
        transaction_date: new Date(), created_by: user_id,
      },
      {
        store_id, party_type: toParty,
        transaction_type: "contra_cancel", reference_type: "contra_voucher",
        reference_id: voucher.id, debit: 0, credit: amt,
        description: `Contra reversal: refund from ${voucher.to_account ? voucher.to_account.name : toAccId}`,
        transaction_date: new Date(), created_by: user_id,
      },
    ], t);

    return { message: "Contra voucher cancelled successfully", voucher_id: id };
  });
};

module.exports = { getAll, getById, create, cancel };
