"use strict";

const { Op } = require("sequelize");
const {
  PurchaseReturn,
  PurchaseReturnItem,
  Purchase,
  PurchaseItem,
  Product,
  ProductInventory,
  ProductBatch,
  StockMovement,
  AccountLedger,
  Vendor,
  Store,
  User,
  DebitNote,
  DebitNoteLine,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog  = require("../auditLog/auditLog.service");
const ledger    = require("../accountLedger/accountLedger.service");
const fLedger   = require("../shared/financialLedger.service");

// ─── Generate Return Number ───────────────────────────────────────────────────
const generateReturnNumber = async (t = null) => {
  const today  = new Date();
  const prefix = `PR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const opts = {
    where: { return_number: { [Op.like]: `${prefix}-%` } },
    order: [["id", "DESC"]],
    attributes: ["return_number"],
  };
  if (t) { opts.transaction = t; opts.lock = t.LOCK.UPDATE; }
  const last = await PurchaseReturn.findOne(opts);
  if (!last) return `${prefix}-0001`;
  const seq = parseInt(last.return_number.split("-").pop()) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, "0")}`;
};

// ─── Get All ──────────────────────────────────────────────────────────────────
exports.getAll = async ({ store_id, vendor_id, status, page = 1, limit = 20, search } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { store_id };
  if (vendor_id) where.vendor_id = vendor_id;
  if (status)    where.status    = status;
  if (search) {
    where[Op.or] = [
      { return_number: { [Op.like]: `%${search}%` } },
      { "$Vendor.name$": { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await PurchaseReturn.findAndCountAll({
    where,
    include: [
      { model: Vendor,   attributes: ["id", "name", "company"], required: false },
      { model: Purchase, attributes: ["id", "purchase_number"],  required: false },
      { model: User,     attributes: ["id", "name"],             required: false },
      { model: PurchaseReturnItem, as: "items", attributes: ["id"], required: false },
    ],
    order:     [["created_at", "DESC"]],
    limit:     parseInt(limit),
    offset:    (parseInt(page) - 1) * parseInt(limit),
    distinct:  true,
    subQuery:  false,
  });
  return {
    total:       count,
    page:        parseInt(page),
    limit:       parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data:        rows,
  };
};

// ─── Get By ID ────────────────────────────────────────────────────────────────
exports.getById = async (id, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const ret = await PurchaseReturn.findOne({
    where,
    include: [
      { model: Vendor,   attributes: ["id", "name", "company", "phone"], required: false },
      { model: Purchase, attributes: ["id", "purchase_number"],           required: false },
      { model: User,     attributes: ["id", "name"],                      required: false },
      { model: Store,    attributes: ["id", "name"],                      required: false },
      {
        model: PurchaseReturnItem,
        as: "items",
        include: [{ model: Product, attributes: ["id", "name", "sku"], required: false }],
      },
    ],
  });
  if (!ret) throw new AppError("Purchase return not found", 404);
  return ret;
};

// ─── Get items from original purchase (pre-fill) ──────────────────────────────
exports.getPurchaseItems = async (purchase_id, storeId = null) => {
  const where = { id: purchase_id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const purchase = await Purchase.findOne({
    where,
    include: [
      {
        model: PurchaseItem,
        as: "items",
        include: [{ model: Product, attributes: ["id", "name", "sku", "barcode"], required: false }],
      },
    ],
  });
  if (!purchase) throw new AppError("Purchase not found", 404);
  if (!purchase.items || !purchase.items.length) return [];

  // Get already-returned quantities from previous completed/approved returns
  const returnedItems = await PurchaseReturnItem.findAll({
    attributes: [
      "product_id",
      [sequelize.fn("SUM", sequelize.col("PurchaseReturnItem.quantity")), "returned_qty"],
    ],
    include: [
      {
        model: PurchaseReturn,
        where: { purchase_id, status: { [Op.in]: ["completed", "approved"] } },
        attributes: [],
        required: true,
      },
    ],
    group: ["PurchaseReturnItem.product_id"],
    raw: true,
  });

  const returnedMap = {};
  if (returnedItems) {
    returnedItems.forEach((r) => {
      returnedMap[r.product_id] = parseFloat(r.returned_qty) || 0;
    });
  }

  const result = purchase.items
    .map((item) => {
      const itemData = item.toJSON ? item.toJSON() : item;
      const alreadyReturned = returnedMap[itemData.product_id] || 0;
      const originalQty = parseFloat(itemData.quantity) || 0;
      const availableQty = Math.max(0, originalQty - alreadyReturned);
      return {
        ...itemData,
        quantity: availableQty,
        already_returned: alreadyReturned,
        original_quantity: originalQty,
      };
    })
    .filter((item) => item.quantity > 0);

  return result;
};

// ─── Get vendor purchases that still have returnable items ────────────────────
exports.getPurchasesWithRemainingItems = async (vendor_id, store_id) => {
  const purchases = await Purchase.findAll({
    where: { vendor_id, store_id, status: { [Op.in]: ["received", "partial", "completed"] } },
    include: [{
      model: PurchaseItem,
      as: "items",
      required: false,
      attributes: ["id", "product_id", "quantity"],
    }],
    order: [["created_at", "DESC"]],
  });

  const purchaseIds = purchases.map((p) => p.id);
  if (!purchaseIds.length) return [];

  // Get all returned quantities for these purchases in one query
  const returnedRows = await PurchaseReturnItem.findAll({
    attributes: [
      [sequelize.col("PurchaseReturn.purchase_id"), "purchase_id"],
      "product_id",
      [sequelize.fn("SUM", sequelize.col("PurchaseReturnItem.quantity")), "returned_qty"],
    ],
    include: [{
      model: PurchaseReturn,
      where: { purchase_id: { [Op.in]: purchaseIds }, status: { [Op.in]: ["completed", "approved"] } },
      attributes: [],
      required: true,
    }],
    group: ["PurchaseReturn.purchase_id", "PurchaseReturnItem.product_id"],
    raw: true,
  });

  // Build map: purchase_id -> { product_id -> returned_qty }
  const returnedMap = {};
  (returnedRows || []).forEach((r) => {
    const pid = r.purchase_id;
    if (!returnedMap[pid]) returnedMap[pid] = {};
    returnedMap[pid][r.product_id] = parseFloat(r.returned_qty) || 0;
  });

  return purchases
    .filter((p) => {
      const items = p.items || [];
      if (!items.length) return false;
      const pReturns = returnedMap[p.id] || {};
      return items.some((item) => {
        const origQty = parseFloat(item.quantity) || 0;
        const returned = pReturns[item.product_id] || 0;
        return origQty - returned > 0;
      });
    })
    .map((p) => ({
      id: p.id,
      purchase_number: p.purchase_number,
      total_amount: p.total_amount,
      status: p.status,
    }));
};

// ─── Create Purchase Return ───────────────────────────────────────────────────
exports.create = async (data, user_id) => {
  const {
    store_id,
    vendor_id,
    purchase_id,
    return_date,
    reason,
    notes,
    items,
    refund_method,
  } = data;

  if (!items || !items.length) throw new AppError("At least one item is required", 400);

  const vendor = await Vendor.findByPk(vendor_id);
  if (!vendor) throw new AppError("Vendor not found", 404);

  const returnId = await sequelize.transaction(async (t) => {
    let subtotal   = 0;
    let total_tax  = 0;
    const returnItems    = [];
    const pendingMovements = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, {
        attributes: ["id", "name", "sku"],
        transaction: t,
      });
      if (!product) throw new AppError(`Product ID ${item.product_id} not found`, 404);

      const qty        = parseFloat(item.quantity);
      const unit_price = parseFloat(item.unit_price || 0);
      const tax_rate   = parseFloat(item.tax_rate   || 0);
      const taxable    = qty * unit_price;
      const tax_amount = (taxable * tax_rate) / 100;
      const total      = taxable + tax_amount;

      subtotal  += taxable;
      total_tax += tax_amount;

      const variantId = item.variant_id || null;

      // If linked to a purchase, validate return qty ≤ remaining purchase qty
      if (purchase_id) {
        const purchItem = await PurchaseItem.findOne({
          where: { purchase_id, product_id: item.product_id, variant_id: variantId },
          transaction: t,
        });
        if (purchItem) {
          const origQty = parseFloat(purchItem.quantity) || 0;
          // Sum already-returned quantities for this product+purchase
          const retSum = await PurchaseReturnItem.findOne({
            attributes: [[sequelize.fn("SUM", sequelize.col("PurchaseReturnItem.quantity")), "returned"]],
            where: { product_id: item.product_id },
            include: [{
              model: PurchaseReturn,
              where: { purchase_id, status: { [Op.in]: ["completed", "approved"] } },
              attributes: [],
              required: true,
            }],
            transaction: t,
            raw: true,
          });
          const alreadyReturned = parseFloat(retSum?.returned) || 0;
          const remaining = origQty - alreadyReturned;
          if (qty > remaining) {
            throw new AppError(
              `Cannot return more than remaining purchase quantity for "${product.name}". ` +
              `Purchased: ${origQty}, Already returned: ${alreadyReturned}, Remaining: ${Math.max(0, remaining)}`,
              400
            );
          }
        }
      }

      // Stock validation — return cannot exceed current inventory
      const inventory = await ProductInventory.findOne({
        where: { product_id: item.product_id, variant_id: variantId, store_id },
        transaction: t,
      });
      if (inventory) {
        const qty_before = parseFloat(inventory.quantity);
        if (qty > qty_before) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${qty_before}, requested to return: ${qty}`,
            400
          );
        }
        const qty_after = qty_before - qty;
        await inventory.update({ quantity: qty_after }, { transaction: t });

        // FIFO Batch Deduction
        let remaining = qty;
        const batches = await ProductBatch.findAll({
          where: { product_id: item.product_id, variant_id: variantId, store_id, is_active: 1, current_quantity: { [Op.gt]: 0 } },
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

        // Collect movement — reference_id set after return record is created
        pendingMovements.push({
          product_id:      item.product_id,
          variant_id:      variantId,
          store_id,
          user_id,
          movement_type:   "purchase_return",
          reference_type:  "purchase_return",
          quantity_before: qty_before,
          quantity_change: -qty,
          quantity_after:  qty_after,
          notes: `Purchase Return`,
        });
      }

      returnItems.push({
        product_id:       item.product_id,
        variant_id:       variantId,
        purchase_item_id: item.purchase_item_id || null,
        quantity:         qty,
        unit_price,
        tax_rate,
        tax_amount,
        total_amount: total,
        reason:       item.reason || null,
      });
    }

    const total_amount  = subtotal + total_tax;
    const refund_amount = total_amount;
    const return_number = await generateReturnNumber(t);

    const purchaseReturn = await PurchaseReturn.create(
      {
        return_number,
        store_id,
        vendor_id,
        purchase_id:   purchase_id || null,
        user_id,
        return_date:   return_date || new Date(),
        status:        "completed",
        reason:        reason || null,
        notes:         notes  || null,
        subtotal,
        tax_amount:    total_tax,
        total_amount,
        refund_amount,
        refund_method: refund_method || "adjustment",
        refund_status: "processed",
      },
      { transaction: t },
    );

    // Bulk-create stock movements now that purchaseReturn.id is known
    if (pendingMovements.length) {
      await StockMovement.bulkCreate(
        pendingMovements.map((m) => ({ ...m, reference_id: purchaseReturn.id })),
        { transaction: t },
      );
    }

    // Create return items
    await PurchaseReturnItem.bulkCreate(
      returnItems.map((i) => ({ ...i, purchase_return_id: purchaseReturn.id })),
      { transaction: t },
    );

    // If linked to a purchase, reduce its due_amount
    if (purchase_id) {
      const purchase = await Purchase.findByPk(purchase_id, { transaction: t });
      if (purchase) {
        const new_due    = Math.max(0, parseFloat(purchase.due_amount) - refund_amount);
        const new_status = new_due <= 0 ? "paid" : parseFloat(purchase.paid_amount) > 0 ? "partial" : "unpaid";
        await purchase.update(
          { due_amount: new_due, payment_status: new_status },
          { transaction: t },
        );
      }
    }

    // Update vendor balance
    await Vendor.decrement("balance", {
      by: refund_amount,
      where: { id: vendor_id },
      transaction: t,
    });

    await ledger.writeEntries(
      [
        {
          store_id,
          party_type: "supplier",
          party_id: vendor_id,
          transaction_type: "purchase_return",
          reference_type: "purchase_return",
          reference_id: purchaseReturn.id,
          debit: refund_amount,
          credit: 0,
          description: `Purchase Return #${return_number}`,
          transaction_date: purchaseReturn.return_date,
          created_by: user_id,
        },
        {
          store_id,
          party_type: "inventory",
          transaction_type: "purchase_return",
          reference_type: "purchase_return",
          reference_id: purchaseReturn.id,
          debit: 0,
          credit: refund_amount,
          description: `Inventory reduced by purchase return #${return_number}`,
          transaction_date: purchaseReturn.return_date,
          created_by: user_id,
        },
      ],
      t,
    );

    const jeLines = [
      { mappingKey: "default_creditor", debit: refund_amount, credit: 0 },
      { mappingKey: "stock_in_hand",    debit: 0, credit: subtotal },
    ];
    if (total_tax > 0) {
      jeLines.push({ mappingKey: "purchase_tax_credit", debit: 0, credit: total_tax });
    }
    await fLedger.postNamedJE({
      store_id, reference_type: "purchase_return", reference_id: purchaseReturn.id,
      date: purchaseReturn.return_date, description: `Purchase Return #${return_number}`,
      namedLines: jeLines,
      user_id,
    }, t);

    await auditLog.log({
      store_id,
      user_id,
      module:         "purchase_returns",
      action:         "create",
      reference_type: "purchase_return",
      reference_id:   purchaseReturn.id,
      new_values: {
        return_number,
        vendor_id,
        total_amount,
        items_count: returnItems.length,
      },
    });

    // Auto-create Debit Note for tracking
    if (refund_amount > 0) {
      const today = purchaseReturn.return_date || new Date();
      const month = today instanceof Date ? today.toISOString().slice(0, 7).replace("-", "") : new Date().toISOString().slice(0, 7).replace("-", "");
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

      const debitNote = await DebitNote.create({
        store_id,
        debit_note_number: dnNumber,
        date: today,
        vendor_id,
        reference_bill: return_number,
        payment_status: "Outstanding",
        currency: "INR",
        notes: `Purchase return #${return_number}`,
        subtotal: refund_amount,
        created_by: user_id,
      }, { transaction: t });

      await DebitNoteLine.bulkCreate(
        returnItems.map((ri) => ({
          debit_note_id: debitNote.id,
          description: `Return: Product #${ri.product_id}${ri.reason ? " (" + ri.reason + ")" : ""}`,
          qty: ri.quantity,
          rate: ri.unit_price,
          amount: ri.total_amount,
        })),
        { transaction: t },
      );
    }

    return purchaseReturn.id;
  });

  return exports.getById(returnId);
};

// ─── Update Status ────────────────────────────────────────────────────────────
exports.updateStatus = async (id, status, user_id) => {
  const ret = await exports.getById(id);

  await sequelize.transaction(async (t) => {
    await PurchaseReturn.update({ status }, { where: { id }, transaction: t });

    // On cancel: reverse inventory, ledger, and JEs
    if (status === "cancelled" && ret.status !== "cancelled") {
      for (const item of (ret.items || [])) {
        const variantId = item.variant_id || null;
        const inventory = await ProductInventory.findOne({
          where: { product_id: item.product_id, variant_id: variantId, store_id: ret.store_id },
          transaction: t,
        });
        if (inventory) {
          const qty_before = parseFloat(inventory.quantity);
          const restoreQty = parseFloat(item.quantity);
          const qty_after  = qty_before + restoreQty;
          await inventory.update({ quantity: qty_after }, { transaction: t });

          // Restore batches — reverse FIFO (add back from most recent batch first)
          let remaining = restoreQty;
          const batches = await ProductBatch.findAll({
            where: { product_id: item.product_id, variant_id: variantId, store_id: ret.store_id, is_active: 1 },
            order: [["expiry_date", "DESC"], ["id", "DESC"]],
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          for (const batch of batches) {
            if (remaining <= 0) break;
            const batchQty = parseFloat(batch.current_quantity);
            await batch.update({ current_quantity: batchQty + remaining }, { transaction: t });
            remaining = 0;
          }

          await StockMovement.create({
            product_id:      item.product_id,
            variant_id:      variantId,
            store_id:        ret.store_id,
            user_id,
            movement_type:   "purchase_return",
            reference_type:  "purchase_return_cancel",
            reference_id:    id,
            quantity_before: qty_before,
            quantity_change: parseFloat(item.quantity),
            quantity_after:  qty_after,
            notes:           `Purchase Return #${ret.return_number} cancelled`,
          }, { transaction: t });
        }
      }

      // Restore vendor balance
      if (ret.vendor_id && parseFloat(ret.refund_amount || 0) > 0) {
        await Vendor.increment("balance", {
          by: parseFloat(ret.refund_amount),
          where: { id: ret.vendor_id },
          transaction: t,
        });
      }

      // Clear operational ledger entries
      await AccountLedger.destroy({
        where: { reference_type: "purchase_return", reference_id: id },
        transaction: t,
      });

      // Post reversing JE (mirrors the create JE)
      const cancelSubtotal = parseFloat(ret.subtotal || 0);
      const cancelTax = parseFloat(ret.tax_amount || 0);
      const cancelTotal = parseFloat(ret.refund_amount || 0);
      const revLines = [
        { mappingKey: "stock_in_hand",    debit: cancelSubtotal, credit: 0 },
        { mappingKey: "default_creditor", debit: 0, credit: cancelTotal },
      ];
      if (cancelTax > 0) {
        revLines.push({ mappingKey: "purchase_tax_credit", debit: cancelTax, credit: 0 });
      }
      await fLedger.postNamedJE({
        store_id:       ret.store_id,
        reference_type: "purchase_return_cancel",
        reference_id:   id,
        date:           new Date(),
        description:    `Purchase Return #${ret.return_number} cancelled`,
        namedLines: revLines,
        user_id,
      }, t);

      // Delete the auto-created Debit Note
      if (ret.return_number) {
        const debitNote = await DebitNote.findOne({
          where: { store_id: ret.store_id, vendor_id: ret.vendor_id, reference_bill: ret.return_number },
          transaction: t,
        });
        if (debitNote) {
          await DebitNoteLine.destroy({ where: { debit_note_id: debitNote.id }, transaction: t });
          await debitNote.destroy({ transaction: t });
        }
      }
    }
  });

  await auditLog.log({
    store_id:       ret.store_id,
    user_id,
    module:         "purchase_returns",
    action:         "update",
    reference_type: "purchase_return",
    reference_id:   id,
    old_values:     { status: ret.status },
    new_values:     { status },
  });

  return exports.getById(id);
};
