"use strict";
const { Op } = require("sequelize");
const {
  SupplierPayment,
  Vendor,
  Purchase,
  User,
  Store,
  VendorReturn,
  Product,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

// ─── Get All Payments ─────────────────────────────────────────────────────────
exports.getAll = async ({ store_id, page = 1, limit = 20 } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};
  if (store_id != null) where.store_id = store_id;
  const { count, rows } = await SupplierPayment.findAndCountAll({
    where,
    include: [
      { model: Vendor, attributes: ["id", "name", "phone"] },
      { model: Purchase, attributes: ["id", "purchase_number"] },
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

// ─── Get Vendors With Due Amount ──────────────────────────────────────────────
exports.getDueVendors = async (store_id) => {
  const purchWhere = {
    due_amount: { [Op.gt]: 0 },
    payment_status: { [Op.in]: ["unpaid", "partial"] },
  };
  if (store_id != null) purchWhere.store_id = store_id;
  const purchases = await Purchase.findAll({
    where: purchWhere,
    include: [{ model: Vendor, attributes: ["id", "name", "phone"] }],
    raw: true,
  });

  // Group by vendor
  const grouped = {};
  for (const purchase of purchases) {
    const vid = purchase.vendor_id;
    if (!grouped[vid]) {
      grouped[vid] = {
        vendor_id: vid,
        name: purchase["Vendor.name"],
        phone: purchase["Vendor.phone"],
        total_due: 0,
        purchases: [],
      };
    }
    grouped[vid].total_due += parseFloat(purchase.due_amount);
    grouped[vid].purchases.push({
      purchase_id: purchase.id,
      purchase_number: purchase.purchase_number,
      due_amount: parseFloat(purchase.due_amount),
    });
  }

  return Object.values(grouped).sort((a, b) => b.total_due - a.total_due);
};

// ─── Get Payments By Vendor ───────────────────────────────────────────────────
exports.getByVendor = async (vendor_id, store_id) => {
  const vendor = await Vendor.findOne({ where: { id: vendor_id, store_id } });
  if (!vendor) throw new AppError("Vendor not found", 404);

  const paymentWhere = { vendor_id };
  if (store_id != null) paymentWhere.store_id = store_id;
  const payments = await SupplierPayment.findAll({
    where: paymentWhere,
    include: [{ model: Purchase, attributes: ["id", "purchase_number"] }],
    order: [["created_at", "DESC"]],
  });

  const dueWhere = {
    vendor_id,
    payment_status: { [Op.in]: ["unpaid", "partial"] },
  };
  if (store_id != null) dueWhere.store_id = store_id;
  const totalDue = await Purchase.sum("due_amount", {
    where: dueWhere,
  });

  return {
    vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone },
    total_due: parseFloat(totalDue || 0),
    payments,
  };
};

// ─── Get Due Purchases For A Vendor ──────────────────────────────────────────
exports.getDuePurchases = async (vendor_id, store_id) => {
  const where = {
    vendor_id,
    due_amount: { [Op.gt]: 0 },
    payment_status: { [Op.in]: ["unpaid", "partial"] },
  };
  if (store_id != null) where.store_id = store_id;
  return await Purchase.findAll({
    where,
    attributes: [
      "id",
      "purchase_number",
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
    vendor_id,
    purchase_id,
    amount,
    payment_method,
    reference_number,
    notes,
  } = body;

  const vendor = await Vendor.findOne({ where: { id: vendor_id, store_id } });
  if (!vendor) throw new AppError("Vendor not found", 404);

  // Resolve purchase_id from reference_number if it matches a purchase number
  let effectivePurchaseId = purchase_id;
  if (!effectivePurchaseId && reference_number) {
    const matchedPurchase = await Purchase.findOne({
      where: {
        vendor_id,
        store_id,
        purchase_number: reference_number,
        due_amount: { [Op.gt]: 0 },
        payment_status: { [Op.in]: ["unpaid", "partial"] },
      },
    });
    if (matchedPurchase) effectivePurchaseId = matchedPurchase.id;
  }

  if (effectivePurchaseId) {
    const purchase = await Purchase.findByPk(effectivePurchaseId);
    if (!purchase) throw new AppError("Purchase not found", 404);
    if (parseFloat(amount) > parseFloat(purchase.due_amount)) {
      throw new AppError(
        `Amount exceeds due amount of ₹${purchase.due_amount}`,
        400,
      );
    }
  }

  return await sequelize.transaction(async (t) => {
    // Create payment record
    const payment = await SupplierPayment.create(
      {
        store_id,
        vendor_id,
        purchase_id: effectivePurchaseId || null,
        user_id,
        amount,
        payment_method,
        reference_number: reference_number || null,
        notes: notes || null,
        payment_date: new Date(),
      },
      { transaction: t },
    );

    // Update purchase due amount(s)
    if (effectivePurchaseId) {
      // Specific invoice payment — update that one purchase
      const purchase = await Purchase.findByPk(effectivePurchaseId, { transaction: t });
      const new_paid = parseFloat(purchase.paid_amount) + parseFloat(amount);
      const new_due = parseFloat(purchase.total_amount) - new_paid;
      const new_status = new_due <= 0 ? "paid" : "partial";

      await purchase.update(
        {
          paid_amount: new_paid,
          due_amount: new_due < 0 ? 0 : new_due,
          payment_status: new_status,
        },
        { transaction: t },
      );
    } else {
      // Direct payment — auto-allocate across due purchases (FIFO)
      const duePurchases = await Purchase.findAll({
        where: {
          vendor_id,
          store_id,
          due_amount: { [Op.gt]: 0 },
          payment_status: { [Op.in]: ["unpaid", "partial"] },
        },
        order: [["created_at", "ASC"]],
        transaction: t,
      });
      const totalDue = duePurchases.reduce((sum, p) => sum + parseFloat(p.due_amount), 0);
      if (parseFloat(amount) > totalDue) {
        throw new AppError(`Payment amount of ₹${amount} exceeds total due of ₹${totalDue}`, 400);
      }
      let remaining = parseFloat(amount);
      for (const p of duePurchases) {
        if (remaining <= 0) break;
        const pDue = parseFloat(p.due_amount);
        const allocate = Math.min(remaining, pDue);
        const new_paid = parseFloat(p.paid_amount) + allocate;
        const new_due = parseFloat(p.total_amount) - new_paid;
        const new_status = new_due <= 0 ? "paid" : "partial";
        await p.update(
          {
            paid_amount: new_paid,
            due_amount: new_due < 0 ? 0 : new_due,
            payment_status: new_status,
          },
          { transaction: t },
        );
        remaining -= allocate;
      }
    }

    // Update vendor balance (atomic decrement)
    await Vendor.decrement("balance", {
      by: parseFloat(amount),
      where: { id: vendor_id },
      transaction: t,
    });

    await ledger.writeEntries(
      [
        {
          store_id,
          party_type: "supplier",
          party_id: vendor_id,
          transaction_type: "supplier_payment",
          reference_type: "supplier_payment",
          reference_id: payment.id,
          debit: parseFloat(amount),
          credit: 0,
          description: `Payment via ${payment_method}${effectivePurchaseId ? " for Purchase #" + effectivePurchaseId : ""}`,
          transaction_date: new Date(),
          created_by: user_id,
        },
        {
          store_id,
          party_type:
            payment_method === "bank" ||
            payment_method === "bank_transfer" ||
            payment_method === "card" ||
            payment_method === "upi"
              ? "bank"
              : "cash",
          transaction_type: "supplier_payment",
          reference_type: "supplier_payment",
          reference_id: payment.id,
          debit: 0,
          credit: parseFloat(amount),
          description: `Payment via ${payment_method}${effectivePurchaseId ? " for Purchase #" + effectivePurchaseId : ""}`,
          transaction_date: new Date(),
          created_by: user_id,
        },
      ],
      t,
    );

    await fLedger.postNamedJE({
      store_id, reference_type: "supplier_payment", reference_id: payment.id,
      date: new Date(), description: `Supplier Payment`,
      namedLines: [
        { mappingKey: "default_creditor",               debit: parseFloat(amount), credit: 0 },
        { mappingKey: fLedger.paymentMethodToMappingKey(payment_method), debit: 0, credit: parseFloat(amount) },
      ],
      user_id,
    }, t);

    // Audit log
    await auditLog.log({
      store_id,
      user_id,
      module: "supplier_payments",
      action: "create",
      reference_type: "vendor",
      reference_id: vendor_id,
      new_values: { amount, payment_method, purchase_id },
    });

    return payment;
  });
};

// ─── Get One Payment ─────────────────────────────────────────────────────────
exports.getOne = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const payment = await SupplierPayment.findOne({
    where,
    include: [
      { model: Vendor,   attributes: ["id", "name", "phone"] },
      { model: Purchase, attributes: ["id", "purchase_number"] },
      { model: User,     attributes: ["id", "name"] },
    ],
  });
  if (!payment) throw new AppError("Supplier payment not found", 404);
  return payment;
};

// ─── Get Supplier Ledger (Chronological Statement) ───────────────────────────
exports.getLedger = async (vendor_id, store_id) => {
  const vendor = await Vendor.findOne({ where: { id: vendor_id, store_id } });
  if (!vendor) throw new AppError("Vendor not found", 404);

  const purchWhere = { vendor_id };
  if (store_id != null) purchWhere.store_id = store_id;
  const purchases = await Purchase.findAll({
    where: purchWhere,
    attributes: ["id", "purchase_number", "total_amount", "purchase_date"],
    order: [["purchase_date", "ASC"]],
  });

  // 2. Get Payments
  const paymentWhere = { vendor_id };
  if (store_id != null) paymentWhere.store_id = store_id;
  const payments = await SupplierPayment.findAll({
    where: paymentWhere,
    attributes: [
      "id",
      "amount",
      "payment_method",
      "reference_number",
      "payment_date",
      "purchase_id",
    ],
    include: [{ model: Purchase, attributes: ["purchase_number"] }],
    order: [["payment_date", "ASC"]],
  });

  // 3. Get Returns
  const returnWhere = { vendor_id };
  if (store_id != null) returnWhere.store_id = store_id;
  const returns = await VendorReturn.findAll({
    where: returnWhere,
    attributes: [
      "id",
      "quantity",
      "refund_amount",
      "reference_number",
      "return_date",
      "notes",
    ],
    order: [["return_date", "ASC"]],
  });

  // 4. Combine into single timeline
  let timeline = [];

  // Add Purchases (Increases Balance / Debt)
  purchases.forEach((p) => {
    timeline.push({
      date: p.purchase_date,
      type: "purchase",
      ref: p.purchase_number,
      description: "Purchase Invoice",
      amount: parseFloat(p.total_amount),
      is_debt: true,
    });
  });

  // Add Payments (Decreases Balance / Debt)
  payments.forEach((p) => {
    timeline.push({
      date: p.payment_date,
      type: "payment",
      ref: p.reference_number || (p.Purchase && p.Purchase.purchase_number) || "",
      description: "Payment Made (" + p.payment_method + ")",
      amount: parseFloat(p.amount),
      is_debt: false,
    });
  });

  // Add Returns (Decreases Balance / Debt)
  returns.forEach((r) => {
    timeline.push({
      date: r.return_date,
      type: "return",
      ref: r.reference_number || "RET-" + r.id,
      description:
        "Vendor Return" +
        (r.notes ? " - " + r.notes : " x" + r.quantity),
      amount: parseFloat(r.refund_amount),
      is_debt: false,
    });
  });

  // Sort by date
  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate Running Balance
  let running_balance = parseFloat(vendor.opening_balance || 0);
  const result = timeline.map((item) => {
    if (item.is_debt) running_balance += item.amount;
    else running_balance -= item.amount;

    return { ...item, balance: running_balance };
  });

  return {
    vendor: {
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      opening_balance: parseFloat(vendor.opening_balance || 0),
      current_balance: parseFloat(vendor.balance || 0),
    },
    ledger: result,
  };
};

module.exports = {
  getAll: exports.getAll,
  getDueVendors: exports.getDueVendors,
  getByVendor: exports.getByVendor,
  getDuePurchases: exports.getDuePurchases,
  create: exports.create,
  getOne: exports.getOne,
  getLedger: exports.getLedger,
};
