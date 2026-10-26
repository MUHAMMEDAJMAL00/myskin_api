"use strict";

const { Op, fn, col } = require("sequelize");
const { AccountCategory, LedgerAccount, JournalEntry, JournalEntryLine, Store, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const fLedger = require("../shared/financialLedger.service");

// ═══════════════════════════════════════════════════════
//  ACCOUNT CATEGORIES
// ═══════════════════════════════════════════════════════

const getAllCategories = async (store_id, filters = {}) => {
  const { page = 1, limit = 50, search, group } = filters;
  const where = { is_active: 1 };
  if (store_id != null) where.store_id = store_id;
  if (group)  where.group = group;
  if (search) where.name  = { [Op.like]: `%${search}%` };

  const { count, rows } = await AccountCategory.findAndCountAll({
    where,
    order: [["group", "ASC"], ["name", "ASC"]],
    include: [
      {
        model: LedgerAccount,
        as: "ledger_accounts",
        where: { is_active: 1, store_id },
        required: false,
        attributes: ["id", "name"],
      },
    ],
    limit:  parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
  return {
    total:       count,
    page:        parseInt(page),
    limit:       parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data:        rows,
  };
};

const getCategoryById = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const cat = await AccountCategory.findOne({ where });
  if (!cat) throw new AppError("Account category not found", 404);
  return cat;
};

const createCategory = async (data) => {
  const { store_id, name, group } = data;
  const existing = await AccountCategory.findOne({ where: { store_id, name, is_active: 1 } });
  if (existing) throw new AppError(`Category "${name}" already exists`, 409);
  return AccountCategory.create({ store_id, name, group });
};

const updateCategory = async (id, data, store_id) => {
  const cat = await getCategoryById(id, store_id);
  const { name, group } = data;
  await cat.update({ name, group });
  return cat;
};

const deleteCategory = async (id, store_id) => {
  const cat = await getCategoryById(id, store_id);
  const inUse = await LedgerAccount.count({ where: { category_id: id, store_id, is_active: 1 } });
  if (inUse > 0) throw new AppError("Cannot delete category with active ledger accounts", 400);
  await cat.update({ is_active: 0 });
  return { message: "Category deleted" };
};

// ═══════════════════════════════════════════════════════
//  LEDGER ACCOUNTS
// ═══════════════════════════════════════════════════════

const getAllAccounts = async (store_id, filters = {}) => {
  const { page = 1, limit = 50, search, category_id } = filters;
  const where = { is_active: 1 };
  if (store_id != null) where.store_id = store_id;
  if (category_id) where.category_id = category_id;
  if (search)      where.name = { [Op.like]: `%${search}%` };

  const { count, rows } = await LedgerAccount.findAndCountAll({
    where,
    include: [{ model: AccountCategory, as: "category", attributes: ["id", "name", "group"] }],
    order:  [["name", "ASC"]],
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

const getAccountById = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const account = await LedgerAccount.findOne({
    where,
    include: [{ model: AccountCategory, as: "category", attributes: ["id", "name", "group"] }],
  });
  if (!account) throw new AppError("Ledger account not found", 404);
  return account;
};

const createAccount = async (data, user_id = null) => {
  const { store_id, category_id, name, description, opening_balance } = data;
  const cat = await AccountCategory.findOne({ where: { id: category_id, store_id, is_active: 1 } });
  if (!cat) throw new AppError("Account category not found", 404);
  const existing = await LedgerAccount.findOne({ where: { store_id, name, is_active: 1 } });
  if (existing) throw new AppError(`Account "${name}" already exists`, 409);

  const bal = parseFloat(opening_balance || 0);

  return sequelize.transaction(async (t) => {
    const account = await LedgerAccount.create(
      {
        store_id,
        category_id,
        name,
        description:     description || null,
        opening_balance: bal,
      },
      { transaction: t },
    );

    // Convert opening balance into a proper journal entry (standard double-entry)
    if (bal !== 0) {
      const isDebitNormal = ["Asset", "Expenditure"].includes(cat.group);
      const namedLines = isDebitNormal
        ? [
            { name,                        debit: bal, credit: 0 },
            { mappingKey: "opening_balance_equity", debit: 0,   credit: bal },
          ]
        : [
            { mappingKey: "opening_balance_equity", debit: bal, credit: 0 },
            { name,                        debit: 0,   credit: bal },
          ];

      await fLedger.postNamedJE({
        store_id,
        reference_type: "opening_balance",
        reference_id:   account.id,
        date:           new Date(),
        description:    `Opening balance: ${name}`,
        namedLines,
        user_id,
      }, t);
    }

    return account;
  });
};

const updateAccount = async (id, data, store_id, user_id = null) => {
  const account = await getAccountById(id, store_id);
  const { name, description, category_id, opening_balance } = data;
  const newBal = parseFloat(opening_balance ?? account.opening_balance);
  const oldBal = parseFloat(account.opening_balance || 0);

  return sequelize.transaction(async (t) => {
    await account.update({ name, description, category_id, opening_balance: newBal }, { transaction: t });

    if (newBal !== oldBal) {
      const oldJE = await JournalEntry.findOne({
        where: { reference_type: "opening_balance", reference_id: id },
        transaction: t,
      });
      if (oldJE) {
        await JournalEntryLine.destroy({ where: { journal_entry_id: oldJE.id }, transaction: t });
        await oldJE.destroy({ transaction: t });
      }

      if (newBal !== 0) {
        const cat = await AccountCategory.findOne({ where: { id: account.category_id }, transaction: t });
        const isDebitNormal = ["Asset", "Expenditure"].includes(cat?.group);
        const namedLines = isDebitNormal
          ? [{ name: account.name,                       debit: newBal, credit: 0 },
             { mappingKey: "opening_balance_equity", debit: 0,       credit: newBal }]
          : [{ mappingKey: "opening_balance_equity", debit: newBal, credit: 0 },
             { name: account.name,                       debit: 0,      credit: newBal }];

        await fLedger.postNamedJE({
          store_id,
          reference_type: "opening_balance",
          reference_id:   id,
          date:           new Date(),
          description:    `Opening balance: ${account.name}`,
          namedLines,
          user_id,
        }, t);
      }
    }

    return getAccountById(id, store_id);
  });
};

const deleteAccount = async (id, store_id) => {
  const account = await getAccountById(id, store_id);
  const inUse = await JournalEntryLine.count({ where: { ledger_account_id: id } });
  if (inUse > 0) throw new AppError("Cannot delete account with journal entry lines", 400);
  await account.update({ is_active: 0 });
  return { message: "Account deleted" };
};

const getAccountBalance = async (id, store_id) => {
  const account = await getAccountById(id, store_id);
  const rows = await JournalEntryLine.findAll({
    where: { ledger_account_id: id },
    attributes: [
      [fn("SUM", col("debit")),  "total_debit"],
      [fn("SUM", col("credit")), "total_credit"],
    ],
    raw: true,
  });
  const result = rows && rows[0];
  const totalDebit   = parseFloat((result && result.total_debit)  || 0);
  const totalCredit  = parseFloat((result && result.total_credit) || 0);
  return {
    account_id:      id,
    name:            account.name,
    opening_balance: parseFloat(account.opening_balance || 0),
    total_debit:     totalDebit,
    total_credit:    totalCredit,
    balance:         totalDebit - totalCredit,
  };
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountBalance,
};
