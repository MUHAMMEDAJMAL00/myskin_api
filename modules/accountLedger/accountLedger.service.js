"use strict";

const { Op, fn, col } = require("sequelize");
const { AccountLedger, Customer, Vendor, Store, User } = require("../../database/index");
const AppError = require("../../utils/AppError");

// ─── Internal: Write a ledger entry ──────────────────────────────────────────
const writeEntry = async (data, t = null) => {
  const opts = t ? { transaction: t } : {};
  return AccountLedger.create(
    {
      store_id:         data.store_id,
      party_type:       data.party_type,
      party_id:         data.party_id || null,
      transaction_type: data.transaction_type,
      reference_type:   data.reference_type || null,
      reference_id:     data.reference_id || null,
      debit:            parseFloat(data.debit || 0),
      credit:           parseFloat(data.credit || 0),
      balance:          data.balance !== undefined ? parseFloat(data.balance || 0) : null,
      description:      data.description || null,
      transaction_date: data.transaction_date || new Date(),
      created_by:       data.created_by || null,
    },
    opts,
  );
};

const writeEntries = async (entries, t = null) => {
  if (!Array.isArray(entries) || !entries.length) return [];
  const opts = t ? { transaction: t } : {};
  return AccountLedger.bulkCreate(
    entries.map((data) => ({
      store_id:         data.store_id,
      party_type:       data.party_type,
      party_id:         data.party_id || null,
      transaction_type: data.transaction_type,
      reference_type:   data.reference_type || null,
      reference_id:     data.reference_id || null,
      debit:            parseFloat(data.debit || 0),
      credit:           parseFloat(data.credit || 0),
      balance:          data.balance !== undefined ? parseFloat(data.balance || 0) : null,
      description:      data.description || null,
      transaction_date: data.transaction_date || new Date(),
      created_by:       data.created_by || null,
    })),
    opts,
  );
};

const _moneyAccount = (method) =>
  method === "bank" || method === "bank_transfer" || method === "card" || method === "upi"
    ? "bank"
    : "cash";

const recordSale = async ({ store_id, sale_id, customer_id, total_amount, paid_amount = 0, payments = [], invoice_number, sale_date, created_by }, t = null) => {
  const entries = [
    {
      store_id,
      party_type: customer_id ? "customer" : "cash",
      party_id: customer_id || null,
      transaction_type: "sale",
      reference_type: "sales",
      reference_id: sale_id,
      debit: parseFloat(total_amount || 0),
      credit: 0,
      description: `Sale ${invoice_number || sale_id}`,
      transaction_date: sale_date || new Date(),
      created_by,
    },
    {
      store_id,
      party_type: "sales",
      transaction_type: "sale",
      reference_type: "sales",
      reference_id: sale_id,
      debit: 0,
      credit: parseFloat(total_amount || 0),
      description: `Sales revenue ${invoice_number || sale_id}`,
      transaction_date: sale_date || new Date(),
      created_by,
    },
  ];

  (payments || []).forEach((p) => {
    const amount = parseFloat(p.amount || 0);
    if (amount <= 0 || p.payment_method === "credit") return;
    entries.push(
      {
        store_id,
        party_type: _moneyAccount(p.payment_method),
        transaction_type: "customer_payment",
        reference_type: "sales",
        reference_id: sale_id,
        debit: amount,
        credit: 0,
        description: `Sale payment via ${p.payment_method}`,
        transaction_date: sale_date || new Date(),
        created_by,
      },
      {
        store_id,
        party_type: customer_id ? "customer" : _moneyAccount(p.payment_method),
        party_id: customer_id || null,
        transaction_type: "customer_payment",
        reference_type: "sales",
        reference_id: sale_id,
        debit: 0,
        credit: amount,
        description: `Payment received for sale ${invoice_number || sale_id}`,
        transaction_date: sale_date || new Date(),
        created_by,
      },
    );
  });

  return writeEntries(entries, t);
};

const recordPurchase = async ({ store_id, purchase_id, vendor_id, total_amount, payments = [], purchase_number, purchase_date, created_by }, t = null) => {
  const entries = [
    {
      store_id,
      party_type: "inventory",
      transaction_type: "purchase",
      reference_type: "purchase",
      reference_id: purchase_id,
      debit: parseFloat(total_amount || 0),
      credit: 0,
      description: `Inventory purchase ${purchase_number || purchase_id}`,
      transaction_date: purchase_date || new Date(),
      created_by,
    },
    {
      store_id,
      party_type: "supplier",
      party_id: vendor_id,
      transaction_type: "purchase",
      reference_type: "purchase",
      reference_id: purchase_id,
      debit: 0,
      credit: parseFloat(total_amount || 0),
      description: `Supplier payable ${purchase_number || purchase_id}`,
      transaction_date: purchase_date || new Date(),
      created_by,
    },
  ];

  (payments || []).forEach((p) => {
    const amount = parseFloat(p.amount || 0);
    if (amount <= 0) return;
    entries.push(
      {
        store_id,
        party_type: "supplier",
        party_id: vendor_id,
        transaction_type: "supplier_payment",
        reference_type: "purchase",
        reference_id: purchase_id,
        debit: amount,
        credit: 0,
        description: `Supplier payment for ${purchase_number || purchase_id}`,
        transaction_date: purchase_date || new Date(),
        created_by,
      },
      {
        store_id,
        party_type: _moneyAccount(p.payment_method),
        transaction_type: "supplier_payment",
        reference_type: "purchase",
        reference_id: purchase_id,
        debit: 0,
        credit: amount,
        description: `Payment via ${p.payment_method}`,
        transaction_date: purchase_date || new Date(),
        created_by,
      },
    );
  });

  return writeEntries(entries, t);
};

// ─── Get Ledger (party statement) ─────────────────────────────────────────────
const getLedger = async ({ store_id, party_type, party_id, from, to } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  if (!party_type || !party_id) throw new AppError("party_type and party_id are required", 400);

  const where = { store_id, party_type, party_id };

  if (from || to) {
    where.transaction_date = {};
    if (from) where.transaction_date[Op.gte] = from;
    if (to)   where.transaction_date[Op.lte] = to;
  }

  const rows = await AccountLedger.findAll({
    where,
    order: [["transaction_date", "ASC"], ["id", "ASC"]],
  });

  // Build running balance
  // For suppliers (liability): credit = we owe more, debit = we owe less
  //   → negate so positive balance = amount we owe them
  // For customers (asset): debit = they owe us more, credit = they owe us less
  //   → keep as-is so positive balance = amount they owe us
  const isSupplier = party_type === "supplier";
  let balance = 0;
  const ledger = rows.map((r) => {
    const raw = parseFloat(r.debit) - parseFloat(r.credit);
    balance += isSupplier ? -raw : raw;
    return {
      id:               r.id,
      date:             r.created_at || r.transaction_date,
      transaction_type: r.transaction_type,
      reference_type:   r.reference_type,
      reference_id:     r.reference_id,
      debit:            parseFloat(r.debit),
      credit:           parseFloat(r.credit),
      description:      r.description,
      created_at:       r.created_at,
    };
  });

  // Fetch party info with store scoping
  let party = null;
  if (party_type === "customer") {
    party = await Customer.findOne({
      where: { id: party_id, store_id },
      attributes: ["id", "name", "phone", "balance"],
    });
  } else {
    party = await Vendor.findOne({
      where: { id: party_id, store_id },
      attributes: ["id", "name", "phone", "balance"],
    });
  }

  return {
    party_type,
    party,
    current_balance: parseFloat(balance.toFixed(2)),
    ledger: ledger.reverse(), // Newest first for UI
  };
};

// ─── Get Balance Only ─────────────────────────────────────────────────────────
const getBalance = async ({ store_id, party_type, party_id }) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  if (!party_type || !party_id) throw new AppError("party_type and party_id are required", 400);

  const where = { store_id, party_type, party_id };

  const result = await AccountLedger.findAll({
    where,
    attributes: [
      [fn("SUM", col("debit")),  "total_debit"],
      [fn("SUM", col("credit")), "total_credit"],
    ],
    raw: true,
  });

  const total_debit  = parseFloat((result[0] && result[0].total_debit)  || 0);
  const total_credit = parseFloat((result[0] && result[0].total_credit) || 0);
  const raw          = total_debit - total_credit;
  const balance      = party_type === "supplier" ? -raw : raw;

  return { party_type, party_id, total_debit, total_credit, balance };
};

// ─── Manual Adjustment ────────────────────────────────────────────────────────
const createAdjustment = async (data, user_id) => {
  const { store_id, party_type, party_id, debit, credit, description, transaction_date } = data;
  if (!store_id) throw new AppError("store_id is required", 400);
  if (!party_type) throw new AppError("party_type is required", 400);

  if (!debit && !credit) throw new AppError("debit or credit amount required", 400);

  return writeEntry({
    store_id,
    party_type,
    party_id,
    transaction_type: "adjustment",
    reference_type:   "manual",
    debit:            parseFloat(debit || 0),
    credit:           parseFloat(credit || 0),
    description,
    transaction_date: transaction_date || new Date(),
    created_by:       user_id,
  });
};

module.exports = {
  writeEntry,
  writeEntries,
  recordSale,
  recordPurchase,
  getLedger,
  getBalance,
  createAdjustment,
};
