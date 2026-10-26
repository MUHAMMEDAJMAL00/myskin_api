"use strict";
const { Op } = require("sequelize");
const {
  CustomerPayment,
  Customer,
  Sale,
  User,
  Return,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

// ─── Get All Payments ─────────────────────────────────────────────────────────
exports.getAll = async ({ store_id, page = 1, limit = 20 } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = { store_id };
  const { count, rows } = await CustomerPayment.findAndCountAll({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"] },
      { model: Sale, attributes: ["id", "invoice_number"] },
      { model: User, attributes: ["id", "name"] },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
  });
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data: rows,
  };
};

// ─── Get Customers With Due Amount ────────────────────────────────────────────
exports.getDueCustomers = async (store_id) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { due_amount: { [Op.gt]: 0 }, store_id };
  const sales = await Sale.findAll({
    where,
    include: [{ model: Customer, attributes: ["id", "name", "phone"] }],
    attributes: ["customer_id", "due_amount", "invoice_number", "id"],
    raw: true,
  });

  // Group by customer
  const grouped = {};
  for (const sale of sales) {
    const cid = sale.customer_id;
    if (!cid) continue;
    if (!grouped[cid]) {
      grouped[cid] = {
        customer_id: cid,
        name: sale["Customer.name"],
        phone: sale["Customer.phone"],
        total_due: 0,
        invoices: [],
      };
    }
    grouped[cid].total_due += parseFloat(sale.due_amount);
    grouped[cid].invoices.push({
      sale_id: sale.id,
      invoice_number: sale.invoice_number,
      due_amount: parseFloat(sale.due_amount),
    });
  }

  return Object.values(grouped).sort((a, b) => b.total_due - a.total_due);
};

// ─── Get Payments By Customer ─────────────────────────────────────────────────
exports.getByCustomer = async (customer_id, store_id) => {
  const customer = await Customer.findOne({ where: { id: customer_id, store_id } });
  if (!customer) throw new AppError("Customer not found", 404);

  const paymentWhere = { customer_id };
  if (store_id != null) paymentWhere.store_id = store_id;
  const payments = await CustomerPayment.findAll({
    where: paymentWhere,
    include: [{ model: Sale, attributes: ["id", "invoice_number"] }],
    order: [["created_at", "DESC"]],
  });

  const totalDueWhere = {
    customer_id,
    status: "completed",
    due_amount: { [Op.gt]: 0 },
  };
  if (store_id != null) totalDueWhere.store_id = store_id;
  const totalDue = await Sale.sum("due_amount", {
    where: totalDueWhere,
  });

  return {
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    total_due: parseFloat(totalDue || 0),
    payments,
  };
};

// ─── Get Due Sales For A Customer ─────────────────────────────────────────────
exports.getDueSales = async (customer_id, store_id) => {
  const where = {
    customer_id,
    status: "completed",
    due_amount: { [Op.gt]: 0 },
  };
  if (store_id != null) where.store_id = store_id;
  return await Sale.findAll({
    where,
    attributes: [
      "id",
      "invoice_number",
      "total_amount",
      "paid_amount",
      "due_amount",
      "created_at",
    ],
    order: [["created_at", "ASC"]],
  });
};

// ─── Create Payment ───────────────────────────────────────────────────────────
exports.create = async (body, user_id, store_id) => {
  const {
    customer_id,
    sale_id,
    amount,
    payment_method,
    reference_number,
    notes,
  } = body;

  const customer = await Customer.findOne({ where: { id: customer_id, store_id } });
  if (!customer) throw new AppError("Customer not found", 404);

  const result = await sequelize.transaction(async (t) => {
    // If sale_id provided, validate that payment doesn't exceed invoice due
    if (sale_id) {
      const sale = await Sale.findOne({
        where: { id: sale_id, store_id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!sale) throw new AppError("Sale not found", 404);
      if (parseFloat(amount) > parseFloat(sale.due_amount)) {
        throw new AppError(
          `Amount exceeds invoice due of ₹${sale.due_amount}`,
          400,
        );
      }
    }

    // Create payment record
    const payment = await CustomerPayment.create(
      {
        store_id,
        customer_id,
        sale_id: sale_id || null,
        user_id,
        amount,
        payment_method,
        reference_number: reference_number || null,
        notes: notes || null,
        payment_date: new Date(),
      },
      { transaction: t },
    );

    // Update sale due amount if sale_id provided
    if (sale_id) {
      const sale = await Sale.findByPk(sale_id, { transaction: t });
      const new_paid = parseFloat(sale.paid_amount) + parseFloat(amount);
      const new_due = parseFloat(sale.total_amount) - new_paid;
      const new_ps = new_due <= 0 ? "paid" : "partial";
      await sale.update(
        {
          paid_amount: new_paid,
          due_amount: new_due < 0 ? 0 : new_due,
          payment_status: new_ps,
        },
        { transaction: t },
      );
    }

    // Reduce customer balance (Allows negative balance for Store Credit)
    await Customer.decrement("balance", {
      by: parseFloat(amount),
      where: { id: customer_id },
      transaction: t,
    });

    await ledger.writeEntries(
      [
        {
          store_id,
          party_type:
            payment_method === "bank" ||
            payment_method === "card" ||
            payment_method === "upi"
              ? "bank"
              : "cash",
          transaction_type: "customer_payment",
          reference_type: "customer_payment",
          reference_id: payment.id,
          debit: parseFloat(amount),
          credit: 0,
          description: `Payment via ${payment_method}${sale_id ? " for Sale #" + sale_id : ""}`,
          transaction_date: new Date(),
          created_by: user_id,
        },
        {
          store_id,
          party_type: "customer",
          party_id: customer_id,
          transaction_type: "customer_payment",
          reference_type: "customer_payment",
          reference_id: payment.id,
          debit: 0,
          credit: parseFloat(amount),
          description: `Payment via ${payment_method}${sale_id ? " for Sale #" + sale_id : ""}`,
          transaction_date: new Date(),
          created_by: user_id,
        },
      ],
      t,
    );

    await fLedger.postNamedJE({
      store_id, reference_type: "customer_payment", reference_id: payment.id,
      date: new Date(), description: `Customer Payment`,
      namedLines: [
        { mappingKey: fLedger.paymentMethodToMappingKey(payment_method), debit: parseFloat(amount), credit: 0 },
        { mappingKey: "default_debtor",                     debit: 0, credit: parseFloat(amount) },
      ],
      user_id,
    }, t);

    const updatedCustomer = await Customer.findByPk(customer_id, {
      attributes: ["id", "name", "balance"],
      transaction: t,
    });

    return { payment, customer_balance: parseFloat(updatedCustomer.balance) };
  });

  // Audit log outside transaction so it doesn't affect payment write
  await auditLog.log({
    store_id,
    user_id,
    module: "customer_payments",
    action: "create",
    reference_type: "customer",
    reference_id: customer_id,
    new_values: { amount, payment_method, sale_id },
  });

  return result;
};

// ─── Get Single Payment ───────────────────────────────────────────────────────
exports.getOne = async (id, store_id = null) => {
  const where = { id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const payment = await CustomerPayment.findOne({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"] },
      { model: Sale, attributes: ["id", "invoice_number"] },
      { model: User, attributes: ["id", "name"] },
    ],
  });
  if (!payment) throw new AppError("Payment not found", 404);
  return payment;
};

// ─── Get Chronological Ledger ────────────────────────────────────────────────
exports.getLedger = async (customer_id, store_id) => {
  const customer = await Customer.findOne({ where: { id: customer_id, store_id } });
  if (!customer) throw new AppError("Customer not found", 404);

  const saleWhere = { customer_id, status: "completed" };
  if (store_id != null) saleWhere.store_id = store_id;
  const sales = await Sale.findAll({
    where: saleWhere,
    attributes: ["id", "invoice_number", "total_amount", "sale_date", "created_at"],
  });

  // 2. Fetch Payments (Credits - Decreases what they owe)
  const paymentWhere = { customer_id };
  if (store_id != null) paymentWhere.store_id = store_id;
  const payments = await CustomerPayment.findAll({
    where: paymentWhere,
    attributes: ["id", "amount", "payment_method", "payment_date", "created_at"],
  });

  // 3. Fetch Returns (Credits - Decreases what they owe)
  const returnWhere = { customer_id, status: "completed" };
  if (store_id != null) returnWhere.store_id = store_id;
  const returns = await Return.findAll({
    where: returnWhere,
    attributes: ["id", "return_number", "total_amount", "return_date", "created_at"],
  });

  // 4. Merge and Sort
  let timeline = [];

  sales.forEach(s => {
    timeline.push({
      date: s.created_at || s.sale_date,
      type: "Sale",
      reference: s.invoice_number,
      debit: parseFloat(s.total_amount),
      credit: 0,
      description: `Invoice #${s.invoice_number}`
    });
  });

  payments.forEach(p => {
    timeline.push({
      date: p.created_at || p.payment_date,
      type: "Payment",
      reference: p.id,
      debit: 0,
      credit: parseFloat(p.amount),
      description: `Payment via ${p.payment_method}`
    });
  });

  returns.forEach(r => {
    timeline.push({
      date: r.created_at || r.return_date,
      type: "Return",
      reference: r.return_number,
      debit: 0,
      credit: parseFloat(r.total_amount),
      description: `Return #${r.return_number}`
    });
  });

  // Sort by date ASC
  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 5. Calculate Running Balance
  let runningBalance = 0;
  timeline = timeline.map(item => {
    runningBalance += (item.debit - item.credit);
    return { ...item, balance: runningBalance };
  });

  return {
    customer: { id: customer.id, name: customer.name, phone: customer.phone, balance: customer.balance },
    ledger: timeline.reverse() // Newest first for UI
  };
};
