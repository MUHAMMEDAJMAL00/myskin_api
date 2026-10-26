"use strict";

const {
  Purchase,
  PurchaseItem,
  PurchasePayment,
  SupplierPayment,
  Product,
  ProductVariant,
  Vendor,
  Store,
  User,
  ProductInventory,
  ProductBatch,
  StockMovement,
  AccountLedger,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");
const { Op } = require("sequelize");

// ─── Generate Purchase Number ─────────────────────────────────────────────────
const generatePurchaseNumber = async (t = null) => {
  const today = new Date();
  const prefix = `PUR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const last = await Purchase.findOne({
    where: { purchase_number: { [Op.like]: `${prefix}-%` } },
    order: [["id", "DESC"]],
    attributes: ["purchase_number"],
    ...(t ? { lock: t.LOCK.UPDATE, transaction: t } : {}),
  });
  if (!last) return `${prefix}-0001`;
  const seq = parseInt(last.purchase_number.split("-").pop()) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, "0")}`;
};

// ─── Get All Purchases ────────────────────────────────────────────────────────
const getAllPurchases = async ({
  store_id,
  vendor_id,
  page = 1,
  limit = 20,
  search,
  status,
  payment_status,
} = {}) => {
  const where = store_id ? { store_id } : {};
  if (vendor_id) where.vendor_id = parseInt(vendor_id);
  if (status) where.status = status;
  if (payment_status) where.payment_status = payment_status;
  if (search) {
    where[Op.or] = [
      { purchase_number: { [Op.like]: `%${search}%` } },
      { "$Vendor.name$": { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Purchase.findAndCountAll({
    where,
    include: [
      {
        model: Vendor,
        attributes: ["id", "name", "company", "phone"],
        required: false,
      },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: PurchaseItem, as: "items", attributes: ["id"], required: false },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
    subQuery: false,
  });
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / limit),
    data: rows,
  };
};

// ─── Get Purchase By ID ───────────────────────────────────────────────────────
const getPurchaseById = async (id, t = null, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const options = {
    where,
    include: [
      {
        model: Vendor,
        attributes: ["id", "name", "company", "phone"],
        required: false,
      },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: PurchaseItem, as: "items", required: false, include: [{ model: ProductVariant, attributes: ["id", "variant_name"] }] },
      { model: PurchasePayment, as: "payments", required: false },
    ],
  };
  if (t) options.transaction = t;
  const purchase = await Purchase.findOne(options);
  if (!purchase) throw new AppError("Purchase not found", 404);
  return purchase;
};

// ─── Create Purchase ──────────────────────────────────────────────────────────
const createPurchase = async (data, user_id) => {
  const {
    store_id,
    vendor_id,
    items,
    payments,
    shipping_charge,
    notes,
    status,
    purchase_date,
    reference_number,
  } = data;

  // Validate store
  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  // Validate vendor
  const vendor = await Vendor.findByPk(vendor_id, { attributes: ["id"] });
  if (!vendor) throw new AppError("Vendor not found", 404);

  // shouldReceive: true for immediate receiving (default), false for purchase orders
  const shouldReceive = !status || status === "received";

  const result = await sequelize.transaction(async (t) => {
    let subtotal = 0;
    let total_tax = 0;
    let total_disc = 0;
    const purchaseItems = [];
    const pendingMovements = [];

    // Process each item
    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.product_id, is_active: 1 },
        attributes: ["id", "name", "sku"],
        transaction: t,
      });
      if (!product)
        throw new AppError(`Product ID ${item.product_id} not found or inactive`, 404);

      const item_subtotal =
        parseFloat(item.unit_cost) * parseFloat(item.quantity);
      const discount_amount = parseFloat(item.discount_amount || 0);
      const taxable_amount = item_subtotal - discount_amount;
      const tax_amount =
        (taxable_amount * parseFloat(item.tax_rate || 0)) / 100;
      const total_cost = taxable_amount + tax_amount;

      subtotal += item_subtotal;
      total_tax += tax_amount;
      total_disc += discount_amount;

      // Batch number always generated so PurchaseItem stores it for later receiving
      const batch_number =
        item.batch_number ||
        `BN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (shouldReceive) {
        const variantId = item.variant_id || null;
        // Add stock to inventory
        let inventory = await ProductInventory.findOne({
          where: { product_id: item.product_id, store_id, variant_id: variantId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!inventory) {
          inventory = await ProductInventory.create(
            { product_id: item.product_id, store_id, variant_id: variantId, quantity: 0, reserved_quantity: 0 },
            { transaction: t },
          );
        }

        const qty_before = parseFloat(inventory.quantity);
        const qty_added  = parseFloat(item.quantity);
        const qty_after  = qty_before + qty_added;
        await inventory.update({ quantity: qty_after }, { transaction: t });

        // Batch management
        let batch = await ProductBatch.findOne({
          where: { product_id: item.product_id, store_id, variant_id: variantId, batch_number },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (batch) {
          await batch.update(
            { current_quantity: parseFloat(batch.current_quantity) + qty_added, purchase_rate: item.unit_cost, is_active: 1 },
            { transaction: t },
          );
        } else {
          await ProductBatch.create(
            {
              product_id: item.product_id,
              store_id,
              variant_id: variantId,
              batch_number,
              purchase_id: null,
              manufacturing_date: item.manufacturing_date || null,
              expiry_date: item.expiry_date || null,
              purchase_rate: item.unit_cost,
              selling_price: item.selling_price || null,
              initial_quantity: qty_added,
              current_quantity: qty_added,
              is_active: 1,
            },
            { transaction: t },
          );
        }

        let notes = `Batch: ${batch_number}`;
        if (qty_before < 0) {
          const resolved = Math.abs(qty_before);
          notes += ` | Resolved backorder: ${resolved} unit${resolved !== 1 ? 's' : ''}`;
        }
        pendingMovements.push({
          product_id: item.product_id,
          variant_id: variantId,
          store_id,
          user_id,
          movement_type: "purchase",
          reference_type: "purchase",
          quantity_before: qty_before,
          quantity_change: qty_added,
          quantity_after: qty_after,
          notes,
        });
      }

      purchaseItems.push({
        product_id: product.id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        discount_amount,
        tax_rate: item.tax_rate || 0,
        tax_amount,
        total_cost,
        batch_number,
        manufacturing_date: item.manufacturing_date || null,
        expiry_date:        item.expiry_date        || null,
      });
    }

    const shipping = parseFloat(shipping_charge || 0);
    const total_amount = subtotal - total_disc + total_tax + shipping;

    // Payment totals
    const paid_amount = (payments || []).reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0,
    );
    const due_amount = total_amount - paid_amount;

    // Payment status
    let payment_status = "unpaid";
    if (paid_amount >= total_amount) payment_status = "paid";
    else if (paid_amount > 0) payment_status = "partial";

    const purchase_number = await generatePurchaseNumber(t);

    // Create purchase
    const purchase = await Purchase.create(
      {
        purchase_number,
        store_id,
        vendor_id,
        user_id,
        purchase_date: purchase_date || new Date(),
        status: status || "received",
        reference_number: reference_number || null,
        subtotal,
        discount_amount: total_disc,
        tax_amount: total_tax,
        shipping_charge: shipping,
        total_amount,
        paid_amount,
        due_amount,
        payment_status,
        notes: notes || null,
      },
      { transaction: t },
    );

    if (shouldReceive) {
      // Link batches to this purchase ID
      await ProductBatch.update(
        { purchase_id: purchase.id },
        {
          where: { purchase_id: null, store_id, product_id: purchaseItems.map((i) => i.product_id) },
          transaction: t,
        },
      );

      // Stock movements
      if (pendingMovements.length) {
        await StockMovement.bulkCreate(
          pendingMovements.map((m) => ({ ...m, reference_id: purchase.id })),
          { transaction: t },
        );
      }
    }

    // Create purchase items (always — needed for later receiving)
    await PurchaseItem.bulkCreate(
      purchaseItems.map((i) => ({ ...i, purchase_id: purchase.id })),
      { transaction: t },
    );

    // Create payments if any
    if (payments && payments.length) {
      await PurchasePayment.bulkCreate(
        payments.map((p) => ({
          purchase_id: purchase.id,
          payment_method: p.payment_method,
          amount: p.amount,
          reference_number: p.reference_number || null,
          notes: p.notes || null,
          payment_date: new Date(),
        })),
        { transaction: t },
      );
    }

    if (shouldReceive) {
      // Vendor balance — only on actual receipt
      if (due_amount > 0) {
        await Vendor.increment("balance", { by: parseFloat(due_amount), where: { id: vendor_id }, transaction: t });
      }

      // ─── Account Ledger + Journal Entry ────────────────────────────────────
      await ledger.recordPurchase(
        { store_id, purchase_id: purchase.id, vendor_id, total_amount, payments, purchase_number: purchase.purchase_number, purchase_date: purchase.purchase_date, created_by: user_id },
        t,
      );

      // JE with GST Input Credit split
      const taxAmt  = parseFloat(total_tax || 0);
      const netCost = taxAmt > 0 ? total_amount - taxAmt : total_amount;
      const jeLines = [];
      jeLines.push({ mappingKey: "stock_in_hand", debit: netCost, credit: 0 });
      if (taxAmt > 0) jeLines.push({ mappingKey: "purchase_tax_credit", debit: taxAmt, credit: 0 });
      jeLines.push({ mappingKey: "default_creditor", debit: 0, credit: total_amount });
      for (const p of payments || []) {
        const mappingKey = fLedger.paymentMethodToMappingKey(p.payment_method);
        jeLines.push({ mappingKey: "default_creditor", debit: parseFloat(p.amount), credit: 0 });
        jeLines.push({ mappingKey, debit: 0, credit: parseFloat(p.amount) });
      }
      await fLedger.postNamedJE(
        { store_id, reference_type: "purchase", reference_id: purchase.id, date: purchase.purchase_date, description: `Purchase ${purchase.purchase_number}`, namedLines: jeLines, user_id },
        t,
      );
    }

    const purchaseResult = getPurchaseById(purchase.id, t);

    return purchaseResult;
  });

  await auditLog.log({
    store_id,
    user_id,
    module: "purchases",
    action: "create",
    reference_type: "purchase",
    reference_id: result.id,
    new_values: {
      purchase_number: result.purchase_number,
      total_amount: result.total_amount,
      status: result.status,
      items_count: result.items.length,
    },
  });

  return result;
};

// ─── Update Purchase Status ───────────────────────────────────────────────────
const updatePurchaseStatus = async (id, data, user_id, store_id) => {
  const old = await getPurchaseById(id, null, store_id);

  await sequelize.transaction(async (t) => {
    await Purchase.update(data, { where: { id, store_id }, transaction: t });

    // ── Receive a purchase order — add stock + post accounting ────────────────
    if (data.status === "received" && old.status === "pending") {
      const items = await PurchaseItem.findAll({ where: { purchase_id: id }, transaction: t });
      const pendingMvts = [];

      for (const item of items) {
        const variantId = item.variant_id || null;
        let inv = await ProductInventory.findOne({
          where: { product_id: item.product_id, variant_id: variantId, store_id: old.store_id },
          transaction: t, lock: t.LOCK.UPDATE,
        });
        if (!inv) {
          inv = await ProductInventory.create(
            { product_id: item.product_id, variant_id: variantId, store_id: old.store_id, quantity: 0, reserved_quantity: 0 },
            { transaction: t },
          );
        }
        const qtyBefore = parseFloat(inv.quantity);
        const qtyAdded  = parseFloat(item.quantity);
        const qtyAfter  = qtyBefore + qtyAdded;
        await inv.update({ quantity: qtyAfter }, { transaction: t });

        const bn = item.batch_number || `BN-${Date.now()}-${item.product_id}`;
        const batch = await ProductBatch.findOne({
          where: { product_id: item.product_id, store_id: old.store_id, variant_id: variantId, batch_number: bn },
          transaction: t, lock: t.LOCK.UPDATE,
        });
        if (batch) {
          await batch.update({ current_quantity: parseFloat(batch.current_quantity) + qtyAdded, is_active: 1 }, { transaction: t });
        } else {
          await ProductBatch.create({
            product_id: item.product_id, store_id: old.store_id, variant_id: variantId,
            batch_number: bn, purchase_id: id,
            purchase_rate: item.unit_cost,
            manufacturing_date: item.manufacturing_date || null,
            expiry_date:        item.expiry_date        || null,
            initial_quantity: qtyAdded, current_quantity: qtyAdded, is_active: 1,
          }, { transaction: t });
        }

        pendingMvts.push({
          product_id: item.product_id, variant_id: variantId, store_id: old.store_id, user_id,
          movement_type: "purchase", reference_type: "purchase", reference_id: id,
          quantity_before: qtyBefore, quantity_change: qtyAdded, quantity_after: qtyAfter,
          notes: `Received on ${old.purchase_number}`,
        });
      }

      if (pendingMvts.length) await StockMovement.bulkCreate(pendingMvts, { transaction: t });

      const dueAmt = parseFloat(old.due_amount || 0);
      if (dueAmt > 0 && old.vendor_id) {
        await Vendor.increment("balance", { by: dueAmt, where: { id: old.vendor_id }, transaction: t });
      }

      await ledger.recordPurchase(
        { store_id: old.store_id, purchase_id: id, vendor_id: old.vendor_id, total_amount: parseFloat(old.total_amount), payments: [], purchase_number: old.purchase_number, purchase_date: old.purchase_date, created_by: user_id },
        t,
      );

      const totalAmt = parseFloat(old.total_amount);
      const taxAmt   = parseFloat(old.tax_amount || 0);
      const netCost  = taxAmt > 0 ? totalAmt - taxAmt : totalAmt;
      const rcvLines = [
        { mappingKey: "stock_in_hand", debit: netCost,   credit: 0 },
        ...(taxAmt > 0 ? [{ mappingKey: "purchase_tax_credit", debit: taxAmt, credit: 0 }] : []),
        { mappingKey: "default_creditor",   debit: 0, credit: totalAmt },
      ];
      await fLedger.postNamedJE({
        store_id: old.store_id, reference_type: "purchase", reference_id: id,
        date: old.purchase_date || new Date(),
        description: `Purchase ${old.purchase_number} received`,
        namedLines: rcvLines, user_id,
      }, t);
    }

    // ── Cancel purchase ───────────────────────────────────────────────────────
    if (data.status === "cancelled" && old.status !== "cancelled") {
      // Only reverse stock/accounting if goods were actually received
      if (old.status === "received") {
        const items = await PurchaseItem.findAll({ where: { purchase_id: id }, transaction: t });

        for (const item of items) {
          const qty = parseFloat(item.quantity);
          const variantId = item.variant_id || null;
          const inv = await ProductInventory.findOne({
            where: { product_id: item.product_id, variant_id: variantId, store_id: old.store_id },
            transaction: t, lock: t.LOCK.UPDATE,
          });
          if (inv) {
            const qtyBefore = parseFloat(inv.quantity);
            if (qty > qtyBefore) {
              const p = item.Product || {};
              throw new AppError(
                `Cannot cancel purchase — insufficient stock for "${p.name || item.product_id}". ` +
                `Available: ${qtyBefore}, required to deduct: ${qty}`,
                400,
              );
            }
            const qtyAfter = qtyBefore - qty;
            await inv.update({ quantity: qtyAfter }, { transaction: t });
            await StockMovement.create({
              product_id: item.product_id, variant_id: variantId, store_id: old.store_id, user_id,
              movement_type: "purchase_return", reference_type: "purchase_cancellation", reference_id: id,
              quantity_before: qtyBefore, quantity_change: -qty, quantity_after: qtyAfter,
              notes: `Purchase ${old.purchase_number} cancelled`,
            }, { transaction: t });
          }
        }

        await ProductBatch.update({ is_active: 0 }, { where: { purchase_id: id }, transaction: t });

        const dueAmt = parseFloat(old.due_amount || 0);
        if (dueAmt > 0 && old.vendor_id) {
          await Vendor.decrement("balance", { by: dueAmt, where: { id: old.vendor_id }, transaction: t });
        }

        await AccountLedger.destroy({ where: { reference_type: "purchase", reference_id: id }, transaction: t });

        // Reversal JE — mirrors the receive JE (GST-split)
        const totalAmt  = parseFloat(old.total_amount);
        const taxAmt    = parseFloat(old.tax_amount || 0);
        const netCost   = taxAmt > 0 ? totalAmt - taxAmt : totalAmt;
        const revLines  = [
          { mappingKey: "default_creditor",   debit: totalAmt, credit: 0 },
          { mappingKey: "stock_in_hand", debit: 0, credit: netCost },
          ...(taxAmt > 0 ? [{ mappingKey: "purchase_tax_credit", debit: 0, credit: taxAmt }] : []),
        ];
        await fLedger.postNamedJE({
          store_id: old.store_id, reference_type: "purchase_cancellation", reference_id: id,
          date: new Date(), description: `Purchase ${old.purchase_number} cancelled`,
          namedLines: revLines, user_id,
        }, t);
      }
    }
  });

  await auditLog.log({
    store_id: store_id || old.store_id,
    user_id,
    module: "purchases",
    action: "update",
    reference_type: "purchase",
    reference_id: id,
    old_values: { status: old.status, payment_status: old.payment_status },
    new_values: data,
  });

  return getPurchaseById(id);
};

// ─── Add Payment To Existing Purchase ────────────────────────────────────────
const addPaymentToPurchase = async (id, data, user_id, store_id) => {
  const { payment_method, amount, reference_number, notes, payment_date } =
    data;

  const purchase = await Purchase.findOne({ where: { id, store_id } });
  if (!purchase) throw new AppError("Purchase not found", 404);

  const payAmount = parseFloat(amount);
  const currentDue = parseFloat(purchase.due_amount);
  if (payAmount > currentDue + 0.01) {
    throw new AppError(
      `Payment ₹${payAmount} exceeds outstanding due ₹${currentDue}`,
      400,
    );
  }

  const paymentResult = await sequelize.transaction(async (t) => {
    await PurchasePayment.create(
      {
        purchase_id: id,
        payment_method,
        amount: payAmount,
        reference_number: reference_number || null,
        notes: notes || null,
        payment_date: payment_date || new Date(),
      },
      { transaction: t },
    );

    await SupplierPayment.create(
      {
        store_id: purchase.store_id,
        vendor_id: purchase.vendor_id,
        purchase_id: id,
        user_id,
        amount: payAmount,
        payment_method,
        reference_number: reference_number || null,
        notes: notes || null,
        payment_date: payment_date || new Date(),
      },
      { transaction: t },
    );

    const new_paid = parseFloat(purchase.paid_amount) + payAmount;
    const new_due = Math.max(0, parseFloat(purchase.total_amount) - new_paid);
    const new_status = new_due <= 0 ? "paid" : "partial";

    await purchase.update(
      {
        paid_amount: new_paid,
        due_amount: new_due,
        payment_status: new_status,
      },
      { transaction: t },
    );

    await Vendor.decrement("balance", {
      by: payAmount,
      where: { id: purchase.vendor_id },
      transaction: t,
    });

    await ledger.writeEntries(
      [
        {
          store_id: purchase.store_id,
          party_type: "supplier",
          party_id: purchase.vendor_id,
          transaction_type: "supplier_payment",
          reference_type: "supplier_payment",
          reference_id: id,
          debit: payAmount,
          credit: 0,
          description: `Payment on Purchase #${id} via ${payment_method}`,
          transaction_date: payment_date || new Date(),
          created_by: user_id,
        },
        {
          store_id: purchase.store_id,
          party_type:
            payment_method === "bank" ||
            payment_method === "bank_transfer" ||
            payment_method === "card" ||
            payment_method === "upi"
              ? "bank"
              : "cash",
          transaction_type: "supplier_payment",
          reference_type: "supplier_payment",
          reference_id: id,
          debit: 0,
          credit: payAmount,
          description: `Payment on Purchase #${id} via ${payment_method}`,
          transaction_date: payment_date || new Date(),
          created_by: user_id,
        },
      ],
      t,
    );

    await fLedger.postNamedJE(
      {
        store_id: purchase.store_id,
        reference_type: "purchase_payment",
        reference_id: id,
        date: payment_date || new Date(),
        description: `Payment on Purchase #${id}`,
        namedLines: [
          { mappingKey: "default_creditor", debit: payAmount, credit: 0 },
          {
            mappingKey: fLedger.paymentMethodToMappingKey(payment_method),
            debit: 0,
            credit: payAmount,
          },
        ],
        user_id,
      },
      t,
    );

    return getPurchaseById(id, t);
  });

  await auditLog.log({
    store_id: purchase.store_id,
    user_id,
    module: "purchases",
    action: "payment",
    reference_type: "purchase",
    reference_id: id,
    new_values: { amount: payAmount, payment_method },
  });

  return paymentResult;
};

module.exports = {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchaseStatus,
  addPaymentToPurchase,
};
