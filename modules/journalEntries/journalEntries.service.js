"use strict";

const { Op, fn, col, literal } = require("sequelize");
const { JournalEntry, JournalEntryLine, LedgerAccount, AccountCategory, User, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");

const _generateRefNumber = async (store_id, date, t = null) => {
  const d = date instanceof Date ? date : (date ? new Date(date) : new Date());
  const month = d.toISOString().slice(0, 7).replace("-", "");
  const prefix = `JE-${month}-`;
  const opts = t ? { transaction: t, lock: t.LOCK.UPDATE } : {};
  const last = await JournalEntry.findOne({
    where: { store_id, reference_number: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
    attributes: ["reference_number"],
    ...opts,
  });
  let seq = 1;
  if (last && last.reference_number) {
    const parts = last.reference_number.split("-");
    seq = parseInt(parts[parts.length - 1] || 0, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
};

// Post a journal entry — must be called inside a Sequelize transaction
const postJournalEntry = async (
  { store_id, date, description, reference_type, reference_id, lines, is_manual = 0, created_by },
  t,
) => {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new AppError("Journal entry must have at least 2 lines", 400);
  }
  const totalDebit  = lines.reduce((s, l) => s + parseFloat(l.debit  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new AppError(`Journal entry unbalanced: debit ${totalDebit} ≠ credit ${totalCredit}`, 400);
  }

  const opts = t ? { transaction: t } : {};
  const reference_number = await _generateRefNumber(store_id, date, t);

  const entry = await JournalEntry.create(
    {
      store_id,
      reference_number,
      date: date || new Date(),
      description:    description    || null,
      reference_type: reference_type || null,
      reference_id:   reference_id   || null,
      is_manual,
      created_by: created_by || null,
    },
    opts,
  );

  const lineAccountIds = lines.map((l) => l.ledger_account_id);
  const validAccounts = await LedgerAccount.findAll({
    where: { id: { [Op.in]: lineAccountIds }, store_id, is_active: 1 },
    attributes: ["id"],
    ...opts,
  });
  if (validAccounts.length !== new Set(lineAccountIds).size) {
    throw new AppError("One or more ledger accounts do not belong to this store", 400);
  }

  await JournalEntryLine.bulkCreate(
    lines.map((l) => ({
      journal_entry_id:  entry.id,
      ledger_account_id: l.ledger_account_id,
      debit:             parseFloat(l.debit  || 0),
      credit:            parseFloat(l.credit || 0),
      description:       l.description || null,
    })),
    opts,
  );

  return entry;
};

// Find a ledger account by name within a store — used by other services when posting JEs
const findAccountByName = async (store_id, name, t = null) => {
  const opts = t ? { transaction: t } : {};
  const account = await LedgerAccount.findOne({ where: { store_id, name, is_active: 1 }, ...opts });
  if (!account) throw new AppError(`Ledger account "${name}" not found for this store`, 404);
  return account;
};

const getAll = async (store_id, filters = {}) => {
  const { page = 1, limit = 20, from, to, search, is_manual } = filters;
  const where = {};
  if (store_id != null) where.store_id = store_id;
  if (is_manual !== undefined && is_manual !== "") where.is_manual = parseInt(is_manual, 10);
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to)   where.date[Op.lte] = to;
  }
  if (search) {
    where[Op.or] = [
      { reference_number: { [Op.like]: `%${search}%` } },
      { description:      { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await JournalEntry.findAndCountAll({
    where,
    include: [
      {
        model: JournalEntryLine,
        as: "lines",
        include: [{ model: LedgerAccount, as: "ledger_account", attributes: ["id", "name"] }],
      },
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
  const entry = await JournalEntry.findOne({
    where,
    include: [
      {
        model: JournalEntryLine,
        as: "lines",
        include: [{ model: LedgerAccount, as: "ledger_account", attributes: ["id", "name"] }],
      },
      { model: User, as: "CreatedBy", attributes: ["id", "name"] },
    ],
  });
  if (!entry) throw new AppError("Journal entry not found", 404);
  return entry;
};

const createManual = async (data, user_id) => {
  const { store_id, date, description, lines } = data;
  return sequelize.transaction(async (t) => {
    return postJournalEntry(
      { store_id, date, description, lines, is_manual: 1, created_by: user_id },
      t,
    );
  });
};

// Ledger account statement: all JE lines for a given account with running balance
const getAccountStatement = async (store_id, account_id, filters = {}) => {
  const { from, to } = filters;

  const accountWhere = { id: account_id };
  if (store_id != null) accountWhere.store_id = store_id;
  const account = await LedgerAccount.findOne({
    where: accountWhere,
    include: [{ model: AccountCategory, as: "category", attributes: ["id", "name", "group"] }],
  });
  if (!account) throw new AppError("Ledger account not found", 404);

  const entryWhere = {};
  if (store_id != null) entryWhere.store_id = store_id;
  if (from || to) {
    entryWhere.date = {};
    if (from) entryWhere.date[Op.gte] = from;
    if (to)   entryWhere.date[Op.lte] = to;
  }

  const lines = await JournalEntryLine.findAll({
    where: { ledger_account_id: account_id },
    include: [{ model: JournalEntry, as: "JournalEntry", where: entryWhere, required: true, attributes: ["id", "reference_number", "date", "created_at", "description", "reference_type", "reference_id"] }],
    order: [[{ model: JournalEntry, as: "JournalEntry" }, "date", "ASC"], [{ model: JournalEntry, as: "JournalEntry" }, "id", "ASC"]],
  });

  const opening = parseFloat(account.opening_balance || 0);
  const creditNormal = ["Liability", "Equity", "Income"].includes(account.category && account.category.group);
  let balance = opening;
  const statement = lines.map((l) => {
    const d = parseFloat(l.debit || 0);
    const c = parseFloat(l.credit || 0);
    balance += creditNormal ? c - d : d - c;
    return {
      date:             l.JournalEntry.created_at || l.JournalEntry.date,
      reference_number: l.JournalEntry.reference_number,
      description:      l.description || l.JournalEntry.description,
      reference_type:   l.JournalEntry.reference_type,
      reference_id:     l.JournalEntry.reference_id,
      debit:            parseFloat(l.debit  || 0),
      credit:           parseFloat(l.credit || 0),
      balance:          parseFloat(balance.toFixed(2)),
    };
  });

  return {
    account: {
      id:              account.id,
      name:            account.name,
      category:        account.category,
      opening_balance: opening,
    },
    closing_balance: parseFloat(balance.toFixed(2)),
    lines:           statement,
  };
};

// ─── General Ledger (all lines chronologically) ────────────────────────────
const getGeneralLedger = async ({ store_id, from_date, to_date, page = 1, limit = 50 }) => {
  const jeWhere = { id: { [Op.ne]: null } };
  if (store_id) jeWhere.store_id = store_id;
  if (from_date || to_date) {
    jeWhere.date = {};
    if (from_date) jeWhere.date[Op.gte] = new Date(from_date);
    if (to_date) jeWhere.date[Op.lte] = new Date(to_date + "T23:59:59");
  }

  const { count, rows } = await JournalEntryLine.findAndCountAll({
    include: [
      {
        model: JournalEntry,
        attributes: ["reference_number", "description", "reference_type", "date"],
        where: jeWhere,
        required: true,
      },
      {
        model: LedgerAccount,
        attributes: ["id", "name"],
        required: false,
      },
    ],
    order: [
      [{ model: JournalEntry }, "date", "ASC"],
      [{ model: JournalEntry }, "id", "ASC"],
      ["debit", "DESC"],
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });

  let running = 0;
  const data = rows.map(line => {
    const entry = line.JournalEntry;
    const account = line.LedgerAccount;
    running += parseFloat(line.debit || 0) - parseFloat(line.credit || 0);
    return {
      id: line.id,
      date: entry ? entry.date : null,
      reference_number: entry ? entry.reference_number : null,
      description: entry ? entry.description : null,
      reference_type: entry ? entry.reference_type : null,
      account_name: account ? account.name : "—",
      debit: parseFloat(line.debit || 0),
      credit: parseFloat(line.credit || 0),
      running_balance: parseFloat(running.toFixed(2)),
    };
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / limit),
    data,
  };
};

module.exports = { postJournalEntry, findAccountByName, getAll, getById, createManual, getAccountStatement, getGeneralLedger };
