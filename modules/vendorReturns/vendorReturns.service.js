"use strict";

/**
 * @deprecated Use modules/purchaseReturns instead.
 * This module (vendorReturns) is the legacy purchase-return implementation.
 * Kept for Quick Record (F2) in the frontend — see modules/purchaseReturns for
 * the full-featured replacement.
 */

const { Op } = require("sequelize");
const {
  VendorReturn,
  Product,
  Store,
  User,
  Vendor,
  Purchase,
  PurchaseItem,
  ProductInventory,
  ProductBatch,
  StockMovement,
  DebitNote,
  DebitNoteLine,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger   = require("../accountLedger/accountLedger.service");
const fLedger  = require("../shared/financialLedger.service");
const auditLog = require("../auditLog/auditLog.service");

const createReturn = async (data, user_id) => {
  const {
    vendor_id,
    product_id,
    store_id,
    quantity,
    reason,
    notes,
    purchase_id,
    reference_number,
    return_action,
    refund_amount,
    variant_id,
  } = data;

  const product = await Product.findByPk(product_id);
  if (!product) throw new AppError("Product not found", 404);

  const vid = variant_id || null;

  return sequelize.transaction(async (t) => {
    // 1. Check inventory
    let inventory = await ProductInventory.findOne({
      where: { product_id, variant_id: vid, store_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!inventory || parseFloat(inventory.quantity) < parseFloat(quantity)) {
      throw new AppError("Insufficient stock for vendor return", 400);
    }

    const qtyBefore = parseFloat(inventory.quantity);
    const qtyChange = -parseFloat(quantity);
    const qtyAfter = qtyBefore + qtyChange;

    // 2. Update inventory
    await inventory.update({ quantity: qtyAfter }, { transaction: t });

    // 2b. FIFO Batch Deduction — mirrors wastage.service.js
    let remaining = parseFloat(quantity);
    const batches = await ProductBatch.findAll({
      where: { product_id, variant_id: vid, store_id, is_active: 1, current_quantity: { [Op.gt]: 0 } },
      order: [["expiry_date", "ASC"], ["id", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    for (const batch of batches) {
      if (remaining <= 0) break;
      const batchQty = parseFloat(batch.current_quantity);
      const deduct = Math.min(batchQty, remaining);
      await batch.update({ current_quantity: batchQty - deduct }, { transaction: t });
      remaining -= deduct;
    }

    // 3. Create Vendor Return record
    const vendorReturn = await VendorReturn.create(
      {
        vendor_id,
        product_id,
        store_id,
        user_id,
        purchase_id: purchase_id || null,
        quantity,
        reason,
        notes,
        reference_number,
        return_action,
        refund_amount: refund_amount || 0,
      },
      { transaction: t },
    );

    // 4. Update vendor balance (atomic decrement)
    const refund = parseFloat(refund_amount || 0);
    if (refund > 0) {
      await Vendor.decrement("balance", {
        by: refund,
        where: { id: vendor_id },
        transaction: t,
      });
    }

    // 5. Ledger entries — debit supplier (reduces payable), credit inventory
    const refundAmt = parseFloat(refund_amount || 0);
    if (refundAmt > 0) {
      const retDate = vendorReturn.created_at || new Date();
      await ledger.writeEntries([
        {
          store_id, party_type: "supplier", party_id: vendor_id,
          transaction_type: "vendor_return", reference_type: "vendor_return",
          reference_id: vendorReturn.id, debit: refundAmt, credit: 0,
          description: `Vendor return #${vendorReturn.id}`,
          transaction_date: retDate, created_by: user_id,
        },
        {
          store_id, party_type: "inventory",
          transaction_type: "vendor_return", reference_type: "vendor_return",
          reference_id: vendorReturn.id, debit: 0, credit: refundAmt,
          description: `Inventory reduced by vendor return #${vendorReturn.id}`,
          transaction_date: retDate, created_by: user_id,
        },
      ], t);

      await fLedger.postNamedJE({
        store_id, reference_type: "vendor_return", reference_id: vendorReturn.id,
        date: retDate,
        description: `Vendor Return #${reference_number || vendorReturn.id}`,
        namedLines: [
          { mappingKey: "default_creditor", debit: refundAmt, credit: 0 },
          { mappingKey: "stock_in_hand",    debit: 0, credit: refundAmt },
        ],
        user_id,
      }, t);
    }

    // 6. Log Stock Movement
    await StockMovement.create(
      {
        product_id,
        variant_id: vid,
        store_id,
        user_id,
        movement_type: "vendor_return",
        reference_type: "vendor_return",
        reference_id: vendorReturn.id,
        quantity_before: qtyBefore,
        quantity_change: qtyChange,
        quantity_after: qtyAfter,
        notes: `Vendor Return: ${reason}. ${notes || ""}`,
      },
      { transaction: t },
    );

    await auditLog.log({
      store_id,
      user_id,
      module:         "vendor_returns",
      action:         "create",
      reference_type: "vendor_return",
      reference_id:   vendorReturn.id,
      new_values: {
        vendor_id,
        product_id,
        quantity,
        reason,
        refund_amount: refund_amount || 0,
        reference_number,
      },
    });

    // Auto-create Debit Note for tracking in reports
    if (refundAmt > 0) {
      const today = new Date();
      const month = today.toISOString().slice(0, 7).replace("-", "");
      const prefix = `DN-${month}-`;
      const lastDN = await DebitNote.findOne({
        where: { store_id, debit_note_number: { [Op.like]: `${prefix}%` } },
        order: [["id", "DESC"]],
        attributes: ["debit_note_number"],
        transaction: t,
      });
      let seq = 1;
      if (lastDN && lastDN.debit_note_number) {
        const parts = lastDN.debit_note_number.split("-");
        seq = parseInt(parts[parts.length - 1] || 0, 10) + 1;
      }
      const dnNumber = `${prefix}${String(seq).padStart(4, "0")}`;

      const product_ = await Product.findByPk(product_id, { attributes: ["name", "sku"], transaction: t });
      const lineDesc = `Vendor Return: ${product_ ? product_.name : "Product #" + product_id}${reason ? " (" + reason + ")" : ""}`;

      const debitNote = await DebitNote.create({
        store_id,
        debit_note_number: dnNumber,
        date: today,
        vendor_id,
        reference_bill: reference_number || null,
        payment_status: "Outstanding",
        currency: "INR",
        notes: notes || `Vendor return #${vendorReturn.id}`,
        subtotal: refundAmt,
        created_by: user_id,
      }, { transaction: t });

      await DebitNoteLine.create({
        debit_note_id: debitNote.id,
        description: lineDesc,
        qty: parseFloat(quantity) || 1,
        rate: refundAmt,
        amount: refundAmt,
      }, { transaction: t });
    }

    return vendorReturn;
  });
};

const getReturns = async (params) => {
  const { store_id, page = 1, limit = 20, search } = params;
  const where = {};
  if (store_id) where.store_id = store_id;
  if (search) {
    where[Op.or] = [
      { reason: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } },
      { reference_number: { [Op.like]: `%${search}%` } },
      { "$Product.name$": { [Op.like]: `%${search}%` } },
      { "$Product.sku$": { [Op.like]: `%${search}%` } },
      { "$Vendor.name$": { [Op.like]: `%${search}%` } },
    ];
  }

  const include = [
    { model: Product, attributes: ["id", "name", "sku"], required: false },
    { model: Vendor, attributes: ["id", "name"], required: false },
    { model: User, attributes: ["id", "name"], required: false },
    { model: Purchase, attributes: ["id", "purchase_number"], required: false },
  ];

  try {
    const { count, rows } = await VendorReturn.findAndCountAll({
      where,
      include,
      order: [["created_at", "DESC"]],
      limit: parseInt(limit) || 20,
      offset: (parseInt(page) - 1) * (parseInt(limit) || 20),
      distinct: true,
      subQuery: false,
    });

    return {
      total: count,
      data: rows,
      total_pages: Math.ceil(count / (parseInt(limit) || 20)),
    };
  } catch (err) {
    throw err;
  }
};

const getReturnById = async (id, store_id = null) => {
  const where = { id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const ret = await VendorReturn.findOne({
    where,
    include: [
      { model: Product,  attributes: ["id", "name", "sku"], required: false },
      { model: Vendor,   attributes: ["id", "name"], required: false },
      { model: User,     attributes: ["id", "name"], required: false },
      { model: Purchase, attributes: ["id", "purchase_number"], required: false },
    ],
  });
  if (!ret) throw new AppError("Vendor return not found", 404);
  return ret;
};

const getReturnByIdInternal = async (id) => getReturnById(id);

const updateStatus = async (id, status, user_id) => {
  const ret = await getReturnByIdInternal(id);
  const validStatuses = ["pending", "approved", "rejected", "completed"];
  if (!validStatuses.includes(status)) throw new AppError(`Invalid status: ${status}`, 400);
  await ret.update({ status });
  return getReturnById(id);
};

const reverseReturn = async (id, user_id, store_id = null) => {
  const where = { id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const vendorReturn = await VendorReturn.findOne({ where, include: [{ model: Product }] });
  if (!vendorReturn) throw new AppError("Vendor return not found", 404);

  const alreadyReversed = await StockMovement.findOne({
    where: { movement_type: "vendor_return_reversal", reference_type: "vendor_return", reference_id: id },
  });
  if (alreadyReversed) throw new AppError("This vendor return has already been reversed", 409);

  const qty = parseFloat(vendorReturn.quantity);
  const refund = parseFloat(vendorReturn.refund_amount || 0);
  const vid = vendorReturn.variant_id || null;

  return sequelize.transaction(async (t) => {
    // 1. Restore inventory
    let inventory = await ProductInventory.findOne({
      where: { product_id: vendorReturn.product_id, store_id: vendorReturn.store_id, variant_id: vid },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!inventory) {
      inventory = await ProductInventory.create({
        product_id: vendorReturn.product_id, store_id: vendorReturn.store_id, variant_id: vid, quantity: 0, reserved_quantity: 0,
      }, { transaction: t });
    }
    const qtyBefore = parseFloat(inventory.quantity);
    const qtyAfter = qtyBefore + qty;
    await inventory.update({ quantity: qtyAfter }, { transaction: t });

    // Restore batches — add qty back to existing batches
    let rem = qty;
    const restoreBatches = await ProductBatch.findAll({
      where: { product_id: vendorReturn.product_id, variant_id: vid, store_id: vendorReturn.store_id, is_active: 1 },
      order: [["expiry_date", "DESC"], ["id", "DESC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    for (const b of restoreBatches) {
      if (rem <= 0) break;
      await b.update({ current_quantity: parseFloat(b.current_quantity) + rem }, { transaction: t });
      rem = 0;
    }

    // 2. Restore vendor balance (atomic)
    if (refund > 0) {
      await Vendor.increment("balance", {
        by: refund,
        where: { id: vendorReturn.vendor_id },
        transaction: t,
      });
    }

    // 3. Log reversal stock movement
    await StockMovement.create({
      product_id: vendorReturn.product_id, variant_id: vid, store_id: vendorReturn.store_id, user_id,
      movement_type: "vendor_return_reversal", reference_type: "vendor_return", reference_id: id,
      quantity_before: qtyBefore, quantity_change: qty, quantity_after: qtyAfter,
      notes: `Vendor return #${id} reversed`,
    }, { transaction: t });

    // 4. Reverse accounting entries
    if (refund > 0) {
      await ledger.writeEntries([
        {
          store_id: vendorReturn.store_id, party_type: "inventory",
          transaction_type: "vendor_return_reversal", reference_type: "vendor_return_reversal",
          reference_id: id, debit: refund, credit: 0,
          description: `Vendor return reversal: inventory restored`,
          transaction_date: new Date(), created_by: user_id,
        },
        {
          store_id: vendorReturn.store_id, party_type: "supplier", party_id: vendorReturn.vendor_id,
          transaction_type: "vendor_return_reversal", reference_type: "vendor_return_reversal",
          reference_id: id, debit: 0, credit: refund,
          description: `Vendor return reversal: payable restored`,
          transaction_date: new Date(), created_by: user_id,
        },
      ], t);

      await fLedger.postNamedJE({
        store_id: vendorReturn.store_id,
        reference_type: "vendor_return_reversal",
        reference_id: id,
        date: new Date(),
        description: `Vendor Return #${vendorReturn.reference_number || id} reversed`,
        namedLines: [
          { mappingKey: "stock_in_hand",    debit: refund, credit: 0 },
          { mappingKey: "default_creditor", debit: 0, credit: refund },
        ],
        user_id,
      }, t);
    }

    // 5. Update status to rejected
    await vendorReturn.update({ status: "rejected" }, { transaction: t });

    // 6. Delete the auto-created Debit Note
    if (refund > 0) {
      const dnNote = `Vendor return #${id}`;
      const debitNote = await DebitNote.findOne({
        where: { store_id: vendorReturn.store_id, vendor_id: vendorReturn.vendor_id, notes: { [Op.like]: `%${dnNote}%` } },
        transaction: t,
      });
      if (debitNote) {
        await DebitNoteLine.destroy({ where: { debit_note_id: debitNote.id }, transaction: t });
        await debitNote.destroy({ transaction: t });
      }
    }

    await auditLog.log({
      store_id: vendorReturn.store_id, user_id,
      module: "vendor_returns", action: "reverse",
      reference_type: "vendor_return", reference_id: id,
      new_values: { status: "rejected", reversed: true },
    });

    return { message: "Vendor return reversed successfully" };
  });
};

const getVendorProducts = async (vendor_id) => {
  if (!vendor_id) throw new AppError("Vendor ID is required", 400);

  const purchaseItems = await PurchaseItem.findAll({
    include: [
      {
        model: Purchase,
        where: { vendor_id: parseInt(vendor_id) },
        attributes: [],
        required: true,
      },
      {
        model: Product,
        attributes: ["id", "name", "sku"],
        required: true,
      },
    ],
    attributes: ["product_id"],
    group: ["product_id", "Product.id"],
  });

  return purchaseItems.map((item) => item.Product);
};

module.exports = {
  createReturn,
  getReturns,
  getReturnById,
  updateStatus,
  reverseReturn,
  getVendorProducts,
};
