"use strict";

const {
  CashRegister,
  CashMovement,
  Store,
  User,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

// ─── Get Active Register ──────────────────────────────────────────────────────
const getActiveRegister = async (store_id) => {
  return CashRegister.findOne({
    where: { store_id, status: "open" },
    include: [
      { model: Store, attributes: ["id", "name", "code"] },
      { model: User, attributes: ["id", "name"] },
      { model: CashMovement, as: "movements", required: false },
    ],
  });
};

// ─── Get Register By ID ───────────────────────────────────────────────────────
const getRegisterById = async (id, storeId = null, t = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const register = await CashRegister.findOne({
    where,
    include: [
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: User, attributes: ["id", "name"], required: false },
      { model: CashMovement, as: "movements", required: false },
    ],
    transaction: t || undefined,
  });
  if (!register) throw new AppError("Cash register not found", 404);
  return register;
};

// ─── Open Register ────────────────────────────────────────────────────────────
const openRegister = async (data, user_id) => {
  const { store_id, opening_balance, notes } = data;

  // Check store exists
  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  // Check if already open
  const existing = await getActiveRegister(store_id);
  if (existing)
    throw new AppError("A cash register is already open for this store", 400);

  const register = await sequelize.transaction(async (t) => {
    const created = await CashRegister.create(
      {
        store_id,
        user_id,
        opening_balance,
        expected_balance: opening_balance,
        status: "open",
        opened_at: new Date(),
        notes: notes || null,
      },
      { transaction: t },
    );

    await CashMovement.create(
      {
        cash_register_id: created.id,
        store_id,
        user_id,
        movement_type: "open",
        amount: opening_balance,
        notes: "Register opened",
      },
      { transaction: t },
    );

    // Link today's cash sales & refunds that happened before this register was opened
    let preOpenAdjustment = 0;
    const { Op } = require("sequelize");
    const { Sale, SalePayment } = require("../../database/index");
    const { Return: ReturnModel } = require("../../database/index");

    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const to = new Date(from.getTime() + 86400000);

    // 1. Cash sales not yet linked to any register today
    const todaySales = await Sale.findAll({
      where: { store_id, status: "completed", sale_date: { [Op.between]: [from, to] } },
      attributes: ["id", "invoice_number"],
      transaction: t,
    });

    if (todaySales.length > 0) {
      const alreadyLinkedSaleIds = (
        await CashMovement.findAll({
          where: { store_id, reference_type: "sale", reference_id: todaySales.map(function (s) { return s.id; }) },
          attributes: ["reference_id"],
          transaction: t,
        })
      ).map(function (m) { return m.reference_id; });
      const linkedSet = new Set(alreadyLinkedSaleIds);

      for (const sale of todaySales) {
        if (linkedSet.has(sale.id)) continue;
        const cashPmts = await SalePayment.findAll({
          where: { sale_id: sale.id, payment_method: "cash" },
          transaction: t,
        });
        const cashAmt = cashPmts.reduce(function (s, p) { return s + parseFloat(p.amount || 0); }, 0);
        if (cashAmt > 0) {
          await CashMovement.create({
            cash_register_id: created.id,
            store_id, user_id,
            movement_type: "cash_in",
            amount: cashAmt,
            reference_type: "sale",
            reference_id: sale.id,
            notes: "Cash sale " + (sale.invoice_number || "#" + sale.id),
          }, { transaction: t });
          preOpenAdjustment += cashAmt;
        }
      }
    }

    // 2. Cash refunds not yet linked to any register today
    const todayReturns = await ReturnModel.findAll({
      where: { store_id, status: "completed", refund_method: "cash", return_date: { [Op.between]: [from, to] } },
      attributes: ["id", "return_number", "total_amount"],
      transaction: t,
    });

    if (todayReturns.length > 0) {
      const alreadyLinkedReturnIds = (
        await CashMovement.findAll({
          where: { store_id, reference_type: "return", reference_id: todayReturns.map(function (r) { return r.id; }) },
          attributes: ["reference_id"],
          transaction: t,
        })
      ).map(function (m) { return m.reference_id; });
      const linkedReturnSet = new Set(alreadyLinkedReturnIds);

      for (const ret of todayReturns) {
        if (linkedReturnSet.has(ret.id)) continue;
        const refAmt = parseFloat(ret.total_amount || 0);
        await CashMovement.create({
          cash_register_id: created.id,
          store_id, user_id,
          movement_type: "cash_out",
          amount: refAmt,
          reference_type: "return",
          reference_id: ret.id,
          notes: "Refund for return " + (ret.return_number || "#" + ret.id),
        }, { transaction: t });
        preOpenAdjustment -= refAmt;
      }
    }

    if (preOpenAdjustment !== 0) {
      const newExpected = parseFloat(created.expected_balance) + preOpenAdjustment;
      await created.update({ expected_balance: newExpected }, { transaction: t });
    }

    await ledger.writeEntry(
      {
        store_id,
        party_type: "cash",
        transaction_type: "opening_cash",
        reference_type: "cash",
        reference_id: created.id,
        debit: opening_balance,
        credit: 0,
        description: "Cash register opened",
        transaction_date: new Date(),
        created_by: user_id,
      },
      t,
    );

    if (opening_balance > 0) {
      await fLedger.postNamedJE({
        store_id,
        reference_type: "cash_register_open",
        reference_id: created.id,
        date: new Date(),
        description: "Cash register opened — opening balance",
        namedLines: [
          { mappingKey: "cash_account", debit: opening_balance, credit: 0 },
          { mappingKey: "opening_balance_equity", debit: 0, credit: opening_balance },
        ],
        user_id,
      }, t);
    }

    return created;
  });

  return getRegisterById(register.id);
};

// ─── Close Register ───────────────────────────────────────────────────────────
const closeRegister = async (id, data, user_id, store_id) => {
  const register = await getRegisterById(id);

  if (register.status === "closed")
    throw new AppError("Register already closed", 400);
  if (register.store_id !== store_id)
    throw new AppError("Register does not belong to your store", 403);

  const { closing_balance, notes } = data;
  const expected_balance = parseFloat(register.expected_balance || 0);
  const difference       = parseFloat(closing_balance || 0) - expected_balance;

  await sequelize.transaction(async (t) => {
    await register.update({
      closing_balance,
      expected_balance,
      difference,
      status:    "closed",
      closed_at: new Date(),
      notes:     notes || register.notes,
    }, { transaction: t });

    await CashMovement.create({
      cash_register_id: id,
      store_id:         register.store_id,
      user_id,
      movement_type:    "close",
      amount:           closing_balance,
      notes:            `Register closed. Difference: ₹${difference}`,
    }, { transaction: t });

    // Post variance JE when actual cash differs from expected
    if (difference !== 0) {
      const amt = Math.abs(difference);
      await fLedger.postNamedJE({
        store_id:       register.store_id,
        reference_type: "cash_variance",
        reference_id:   id,
        date:           new Date(),
        description:    `Cash variance at register close`,
        namedLines: difference > 0
          ? [{ mappingKey: "cash_account",    debit: amt, credit: 0 },
             { mappingKey: "other_income",   debit: 0,   credit: amt }]
          : [{ mappingKey: "general_expenses", debit: amt, credit: 0 },
             { mappingKey: "cash_account",     debit: 0,   credit: amt }],
        user_id,
      }, t);
    }
  });

  return getRegisterById(id);
};

// ─── Cash In / Cash Out ───────────────────────────────────────────────────────
const addMovement = async (id, data, user_id, store_id) => {
  const register = await getRegisterById(id);

  if (register.status === "closed")
    throw new AppError("Cannot add movement to closed register", 400);
  if (register.store_id !== store_id)
    throw new AppError("Register does not belong to your store", 403);

  const { movement_type, amount, notes, reference_type, reference_id } = data;

  // Update expected balance
  const current = parseFloat(register.expected_balance || 0);
  const amtVal  = parseFloat(amount || 0);
  const newBalance =
    movement_type === "cash_in"
      ? current + amtVal
      : current - amtVal;

  if (newBalance < 0) throw new AppError("Insufficient cash in register", 400);

  await sequelize.transaction(async (t) => {
    await register.update({ expected_balance: newBalance }, { transaction: t });

    const movement = await CashMovement.create(
      {
        cash_register_id: id,
        store_id: register.store_id,
        user_id,
        movement_type,
        amount,
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        notes: notes || null,
      },
      { transaction: t },
    );

    await ledger.writeEntries(
      [
        {
          store_id: register.store_id,
          party_type: "cash",
          transaction_type: movement_type,
          reference_type: reference_type || "cash",
          reference_id: reference_id || movement.id,
          debit: movement_type === "cash_in" ? amount : 0,
          credit: movement_type === "cash_out" ? amount : 0,
          description: notes || movement_type,
          transaction_date: new Date(),
          created_by: user_id,
        },
      ],
      t,
    );

    const amt = parseFloat(amount || 0);
    await fLedger.postNamedJE({
      store_id:       register.store_id,
      reference_type: reference_type || "cash_movement",
      reference_id:   reference_id   || movement.id,
      date:           new Date(),
      description:    notes || movement_type,
      namedLines: movement_type === "cash_in"
        ? [
            { mappingKey: "cash_account",  debit: amt, credit: 0 },
            { mappingKey: "other_income",  debit: 0,   credit: amt },
          ]
        : [
            { mappingKey: "general_expenses", debit: amt, credit: 0 },
            { mappingKey: "cash_account",     debit: 0,   credit: amt },
          ],
      user_id,
    }, t);
  });

  return getRegisterById(id);
};

const addPettyCashExpense = async (id, data, user_id, store_id) => {
  const register = await getRegisterById(id);

  if (register.status === "closed")
    throw new AppError("Cannot add petty cash expense to closed register", 400);
  if (register.store_id !== store_id)
    throw new AppError("Register does not belong to your store", 403);

  const amount = parseFloat(data.amount || 0);
  const current = parseFloat(register.expected_balance || 0);
  const newBalance = current - amount;
  if (newBalance < 0) throw new AppError("Insufficient cash in register", 400);

  await sequelize.transaction(async (t) => {
    await register.update({ expected_balance: newBalance }, { transaction: t });

    const movement = await CashMovement.create(
      {
        cash_register_id: id,
        store_id: register.store_id,
        user_id,
        movement_type: "cash_out",
        amount,
        reference_type: "petty_cash",
        reference_id: null,
        notes: data.notes || data.description || "Petty cash expense",
      },
      { transaction: t },
    );

    await ledger.writeEntries(
      [
        {
          store_id: register.store_id,
          party_type: "petty_cash",
          transaction_type: "petty_cash",
          reference_type: "petty_cash",
          reference_id: movement.id,
          debit: amount,
          credit: 0,
          description: data.description || data.notes || "Petty cash expense",
          transaction_date: new Date(),
          created_by: user_id,
        },
        {
          store_id: register.store_id,
          party_type: "cash",
          transaction_type: "petty_cash",
          reference_type: "petty_cash",
          reference_id: movement.id,
          debit: 0,
          credit: amount,
          description: data.description || data.notes || "Petty cash expense",
          transaction_date: new Date(),
          created_by: user_id,
        },
      ],
      t,
    );

    await fLedger.postNamedJE({
      store_id:       register.store_id,
      reference_type: "petty_cash",
      reference_id:   movement.id,
      date:           new Date(),
      description:    data.description || data.notes || "Petty cash expense",
      namedLines: [
        { mappingKey: "general_expenses", debit: amount, credit: 0 },
        { mappingKey: "cash_account",     debit: 0,      credit: amount },
      ],
      user_id,
    }, t);
  });

  return getRegisterById(id);
};

// ─── Get All Registers ────────────────────────────────────────────────────────
const getAllRegisters = async (store_id) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { store_id };
  return CashRegister.findAll({
    where,
    include: [
      { model: Store, attributes: ["id", "name", "code"] },
      { model: User, attributes: ["id", "name"] },
    ],
    order: [["created_at", "DESC"]],
  });
};

// ─── Get Daily Cash Summary ───────────────────────────────────────────────────
const getDailySummary = async (store_id, date) => {
  const { Op } = require("sequelize");
  const day = date ? new Date(date) : new Date();
  const from = new Date(day.setHours(0, 0, 0, 0));
  const to = new Date(day.setHours(23, 59, 59, 999));

  const where = {
    opened_at: { [Op.between]: [from, to] },
  };
  if (store_id) where.store_id = store_id;

  const registers = await CashRegister.findAll({ where });

  const total_opening = registers.reduce(
    (s, r) => s + (parseFloat(r.opening_balance) || 0),
    0,
  );
  const total_closing = registers.reduce(
    (s, r) => s + (parseFloat(r.closing_balance) || 0),
    0,
  );
  const total_expected = registers.reduce(
    (s, r) => s + (parseFloat(r.expected_balance) || 0),
    0,
  );
  const total_diff = registers.reduce(
    (s, r) => s + (parseFloat(r.difference) || 0),
    0,
  );

  return {
    date: from.toISOString().split("T")[0],
    total_registers: registers.length,
    total_opening,
    total_closing,
    total_expected,
    total_difference: total_diff,
    registers,
  };
};

// ─── Shift Summary (for POS app close-register flow) ───────────────────────────
const getShiftSummary = async (store_id, user_id) => {
  const { Op, fn, col } = require("sequelize");
  const { Sale, SalePayment } = require("../../database/index");

  // Find the open register for this store
  const register = await CashRegister.findOne({
    where: { store_id, status: "open" },
    order: [["opened_at", "DESC"]],
  });

  const today = new Date();
  const from = register && register.opened_at
    ? new Date(register.opened_at)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const to   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  to.setSeconds(to.getSeconds() - 1);

  // Sales since this register opened (or today if no open register)
  const saleWhere = { store_id, status: "completed", sale_date: { [Op.between]: [from, to] } };
  const sales = await Sale.findAll({
    where: saleWhere,
    attributes: ["id", "total_amount"],
  });

  const paymentStats = await SalePayment.findAll({
    where: { sale_id: sales.map((s) => s.id) },
    attributes: [
      "payment_method",
      [fn("SUM", col("amount")), "total"],
    ],
    group: ["payment_method"],
    raw: true,
  });

  const paymentBreakdown = {};
  let totalSales   = 0;
  let totalCash    = 0;
  let totalCard    = 0;
  let totalUpi     = 0;
  let totalBank    = 0;
  let totalCredit  = 0;

  paymentStats.forEach((p) => {
    const amt = parseFloat(p.total || 0);
    const method = (p.payment_method || "").toLowerCase();
    paymentBreakdown[method] = amt;
    totalSales += amt;
    if (method === "cash")      totalCash   += amt;
    else if (method === "card") totalCard   += amt;
    else if (method === "upi")  totalUpi    += amt;
    else if (method === "bank" || method === "bank_transfer" || method === "cheque") totalBank += amt;
    else if (method === "credit") totalCredit += amt;
  });

  // Cash refunds since this register opened
  const { Return } = require("../../database/index");
  const refundSum = await Return.findAll({
    where: { store_id, status: "completed", refund_method: "cash", return_date: { [Op.between]: [from, to] } },
    attributes: [[fn("SUM", col("total_amount")), "total"]],
    raw: true,
  });
  const totalRefunds = parseFloat((refundSum[0] && refundSum[0].total) || 0);

  const expectedCash = register
    ? parseFloat(register.expected_balance)
    : 0;

  const suggested = await getSuggestedOpening(store_id);

  return {
    register: register
      ? {
          id: register.id,
          opening_balance: parseFloat(register.opening_balance),
          expected_balance: expectedCash,
        }
      : null,
    suggested_opening: suggested.suggested,
    suggested_source: suggested.source,
    today_sales: {
      total_sales:   totalSales,
      total_cash:    totalCash,
      total_card:    totalCard,
      total_upi:     totalUpi,
      total_bank:    totalBank,
      total_credit:  totalCredit,
      total_refunds: totalRefunds,
      breakdown:     paymentBreakdown,
    },
    cash_in_drawer_should_be: expectedCash,
  };
};

// ─── Get suggested opening balance (last closed register's closing) ──────────
const getSuggestedOpening = async (store_id) => {
  const lastClosed = await CashRegister.findOne({
    where: { store_id, status: "closed" },
    order: [["closed_at", "DESC"]],
    attributes: ["id", "closing_balance", "closed_at"],
  });
  if (!lastClosed) return { suggested: 0, source: null };
  return {
    suggested: parseFloat(lastClosed.closing_balance || 0),
    source: { register_id: lastClosed.id, closed_at: lastClosed.closed_at },
  };
};

module.exports = {
  openRegister,
  closeRegister,
  addMovement,
  addPettyCashExpense,
  getAllRegisters,
  getRegisterById,
  getActiveRegister,
  getDailySummary,
  getShiftSummary,
  getSuggestedOpening,
};
