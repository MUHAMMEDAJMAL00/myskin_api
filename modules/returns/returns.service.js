"use strict";

const {
  Return,
  ReturnItem,
  Sale,
  SaleItem,
  ProductVariant,
  Customer,
  Store,
  User,
  ProductInventory,
  ProductBatch,
  StockMovement,
  LoyaltyTransaction,
  CashRegister,
  CashMovement,
  OfferAuditLog,
  CreditNote,
  CreditNoteLine,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");
const { decrementUsage } = require("../discounts/discount.service");
const { Op } = require("sequelize");

// ─── Generate Return Number ───────────────────────────────────────────────────
const generateReturnNumber = async (store_id, t = null) => {
  const today = new Date();
  const prefix = `RET-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const last = await Return.findOne({
    where: { store_id, return_number: { [Op.like]: `${prefix}-%` } },
    order: [["id", "DESC"]],
    attributes: ["return_number"],
    ...(t ? { lock: t.LOCK.UPDATE, transaction: t } : {}),
  });
  if (!last) return `${prefix}-0001`;
  const seq = parseInt(last.return_number.split("-").pop()) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, "0")}`;
};

// ─── Get All Returns ──────────────────────────────────────────────────────────
const getAllReturns = async ({ store_id, page = 1, limit = 20, search, refund_method } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { store_id };
  if (refund_method) where.refund_method = refund_method;
  if (search) {
    where[Op.or] = [
      { return_number: { [Op.like]: `%${search}%` } },
      { "$Sale.invoice_number$": { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Return.findAndCountAll({
    where,
    include: [
      { model: Sale, attributes: ["id", "invoice_number"], required: false },
      { model: Customer, attributes: ["id", "name", "phone"], required: false },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: ReturnItem, as: "items", attributes: ["id"], required: false },
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

// ─── Get Return By ID ─────────────────────────────────────────────────────────
const getReturnById = async (id, t = null, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const ret = await Return.findOne({
    where,
    include: [
      { model: Sale, attributes: ["id", "invoice_number"], required: false },
      { model: Customer, attributes: ["id", "name", "phone"], required: false },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: ReturnItem, as: "items", required: false, include: [{ model: ProductVariant, attributes: ["id", "variant_name"], required: false }] },
    ],
    transaction: t || undefined,
  });
  if (!ret) throw new AppError("Return not found", 404);
  return ret;
};

// ─── Create Return ────────────────────────────────────────────────────────────
const createReturn = async (data, user_id) => {
  const { sale_id, store_id, items, return_reason, refund_method, notes, customer_id: provided_customer_id, restocking_fee } =
    data;

  // Validate sale exists and belongs to this store
  const sale = await Sale.findOne({
    where: { id: sale_id, store_id },
    attributes: ["id", "customer_id", "status"],
  });
  if (!sale) throw new AppError("Sale not found", 404);
  if (sale.status === "cancelled" || sale.status === "draft")
    throw new AppError(`Cannot return a ${sale.status} sale`, 400);

  // Validate store
  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  // Resolve customer before entering the transaction
  const resolved_customer_id = provided_customer_id || sale.customer_id || null;

  const newRet = await sequelize.transaction(async (t) => {
    let total_amount = 0;
    const returnItems = [];
    const pendingMovements = [];

    for (const item of items) {
      // Validate sale item belongs to this sale
      const saleItem = await SaleItem.findOne({
        where: { id: item.sale_item_id, sale_id },
        attributes: ["id", "quantity", "total_price", "variant_id"],
        transaction: t,
      });
      if (!saleItem)
        throw new AppError(
          `Sale item ID ${item.sale_item_id} not found in this sale`,
          404,
        );

      // Check return quantity doesn't exceed sold quantity (cumulative) — with row lock
      const alreadyReturned = await ReturnItem.sum("quantity", {
        where: { sale_item_id: item.sale_item_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const remaining = parseFloat(saleItem.quantity) - parseFloat(alreadyReturned || 0);
      if (parseFloat(item.quantity) > remaining) {
        throw new AppError(
          `Return quantity exceeds sold quantity for item ${item.product_name}. Already returned: ${alreadyReturned || 0}, remaining: ${remaining}`,
          400,
        );
      }

      const item_total =
        parseFloat(saleItem.total_price || item.unit_price) * parseFloat(item.quantity) / parseFloat(saleItem.quantity);
      total_amount += item_total;

      // Restock inventory if restock = 1
      const shouldRestock = parseInt(item.restock, 10) !== 0;
      if (shouldRestock) {
        const variantId = saleItem.variant_id || item.variant_id || null;
        let inventory = await ProductInventory.findOne({
          where: { product_id: item.product_id, variant_id: variantId, store_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!inventory) {
          inventory = await ProductInventory.create(
            { product_id: item.product_id, variant_id: variantId, store_id, quantity: 0, reserved_quantity: 0 },
            { transaction: t },
          );
        }

        const qty_before = parseFloat(inventory.quantity);
        const qty_after = qty_before + parseFloat(item.quantity);

        await inventory.update({ quantity: qty_after }, { transaction: t });

        // Restore batches — add returned qty back to existing batches
        let rem = parseFloat(item.quantity);
        const restoreBatches = await ProductBatch.findAll({
          where: { product_id: item.product_id, variant_id: variantId, store_id, is_active: 1 },
          order: [["expiry_date", "DESC"], ["id", "DESC"]],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        for (const b of restoreBatches) {
          if (rem <= 0) break;
          await b.update({ current_quantity: parseFloat(b.current_quantity) + rem }, { transaction: t });
          rem = 0;
        }

        pendingMovements.push({
          product_id: item.product_id,
          variant_id: variantId,
          store_id,
          user_id,
          movement_type: "return",
          reference_type: "return",
          quantity_before: qty_before,
          quantity_change: parseFloat(item.quantity),
          quantity_after: qty_after,
          notes: `Return from sale #${sale_id}`,
        });
      }

      returnItems.push({
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        variant_id: saleItem.variant_id || item.variant_id || null,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item_total,
        restock: parseInt(item.restock, 10) || 1,
      });
    }

    const return_number = await generateReturnNumber(store_id, t);

    const final_refund = Math.max(0, total_amount - parseFloat(restocking_fee || 0));

    // Create return
    const ret = await Return.create(
      {
        return_number,
        sale_id,
        store_id,
        user_id,
        customer_id: resolved_customer_id,
        return_reason: return_reason || null,
        total_amount,
        restocking_fee: restocking_fee || 0,
        refund_method,
        status: "completed",
        notes: notes || null,
      },
      { transaction: t },
    );

    // Stock movements — now that ret.id exists
    if (pendingMovements.length) {
      await StockMovement.bulkCreate(
        pendingMovements.map((m) => ({ ...m, reference_id: ret.id })),
        { transaction: t },
      );
    }

    // Create return items
    await ReturnItem.bulkCreate(
      returnItems.map((i) => ({ ...i, return_id: ret.id })),
      { transaction: t },
    );

    // Refund effects based on method
    const cid = resolved_customer_id;
    if (refund_method === "credit" && !cid) {
      throw new AppError("Customer is required for credit refunds. Please attach a customer to the sale first.", 400);
    }
    if (cid) {
      if (refund_method === "credit") {
        await Customer.increment("balance", {
          by: parseFloat(final_refund.toFixed(2)),
          where: { id: cid },
          transaction: t,
        });
      } else if (refund_method === "loyalty_points") {
        const points = Math.floor(final_refund);
        if (points > 0) {
          const customer = await Customer.findByPk(cid, {
            attributes: ["loyalty_points"],
            transaction: t,
          });
          const balance_after = (parseInt(customer.loyalty_points) || 0) + points;
          await Customer.increment("loyalty_points", {
            by: points,
            where: { id: cid },
            transaction: t,
          });
          await LoyaltyTransaction.create(
            {
              customer_id: cid,
              transaction_type: "earn",
              points,
              balance_after,
              notes: `Refund for return ${return_number}`,
            },
            { transaction: t },
          );
        }
      }
    }

    // Determine if sale is fully returned — single aggregate query
    const allSaleItems = await SaleItem.findAll({
      where: { sale_id },
      attributes: ["id", "quantity"],
      transaction: t,
    });
    const saleItemIds = allSaleItems.map(si => si.id);
    const returnedQtys = await ReturnItem.findAll({
      where: { sale_item_id: saleItemIds },
      attributes: ["sale_item_id", [sequelize.fn("SUM", sequelize.col("quantity")), "total_returned"]],
      group: ["sale_item_id"],
      transaction: t,
      raw: true,
    });
    const returnedMap = {};
    returnedQtys.forEach(r => { returnedMap[r.sale_item_id] = parseFloat(r.total_returned) || 0; });
    let isFullyReturned = true;
    for (const si of allSaleItems) {
      if ((returnedMap[si.id] || 0) < parseFloat(si.quantity)) {
        isFullyReturned = false;
        break;
      }
    }
    const newSaleStatus = isFullyReturned ? "returned" : "partial_return";
    const updatePayload = { status: newSaleStatus };
    if (isFullyReturned) updatePayload.payment_status = "refunded";
    await Sale.update(updatePayload, { where: { id: sale_id }, transaction: t });

    await ledger.writeEntries(
      [
        {
          store_id,
          party_type: "sales_return",
          party_id: null,
          transaction_type: "sales_return",
          reference_type: "return",
          reference_id: ret.id,
          debit: parseFloat(final_refund.toFixed(2)),
          credit: 0,
          description: `Sales return #${return_number}`,
          transaction_date: new Date(),
          created_by: user_id,
        },
        {
          store_id,
          party_type:
            refund_method === "bank" ||
            refund_method === "card" ||
            refund_method === "upi"
              ? "bank"
              : refund_method === "credit"
                ? "customer"
                : "cash",
          party_id: refund_method === "credit" ? cid : null,
          transaction_type: "sales_return",
          reference_type: "return",
          reference_id: ret.id,
          debit: 0,
          credit: parseFloat(final_refund.toFixed(2)),
          description: `Refund for return #${return_number}`,
          transaction_date: new Date(),
          created_by: user_id,
        },
      ],
      t,
    );

    // JE: Debit Sales Return, Credit Default Debtor (credit) or Cash/Bank (cash refund)
    const refundMappingKey = (refund_method === "credit" && cid)
      ? "default_debtor"
      : fLedger.paymentMethodToMappingKey(refund_method);
    await fLedger.postNamedJE({
      store_id, reference_type: "return", reference_id: ret.id,
      date: new Date(), description: `Sales Return #${return_number}`,
      namedLines: [
        { mappingKey: "sale_return",  debit: parseFloat(final_refund.toFixed(2)), credit: 0 },
        { mappingKey: refundMappingKey,   debit: 0, credit: parseFloat(final_refund.toFixed(2)) },
      ],
      user_id,
    }, t);

    // Log cash-out in register when refund goes back as cash or bank
    if (refund_method === "cash" || refund_method === "bank") {
      const register = await CashRegister.findOne({
        where: { store_id, status: "open" },
        transaction: t,
      });
      if (register) {
        const newBalance = parseFloat(register.expected_balance) - parseFloat(final_refund.toFixed(2));
        await register.update({ expected_balance: newBalance }, { transaction: t });
        await CashMovement.create({
          cash_register_id: register.id,
          store_id,
          user_id,
          movement_type: "cash_out",
          amount: parseFloat(final_refund.toFixed(2)),
          reference_type: "return",
          reference_id: ret.id,
          notes: `Refund for return ${return_number}`,
        }, { transaction: t });
      } else {
        throw new AppError("No open cash register found. Please open a register before processing cash/bank refunds.", 400);
      }
    }

    // Reverse offer usage_count for any promo applied to this sale
    const offerLogs = await OfferAuditLog.findAll({
      where: { sale_id, is_refunded: 0 },
      attributes: ["id", "offer_id"],
      transaction: t,
    });
    for (const log of offerLogs) {
      await decrementUsage(log.offer_id, t);
      await log.update({ is_refunded: 1, refund_reason: `Return ${return_number}` }, { transaction: t });
    }

    // Auto-create Credit Note when refund_method is "credit"
    if (refund_method === "credit" && cid && final_refund > 0) {
      const today = ret.created_at || new Date();
      const month = today instanceof Date ? today.toISOString().slice(0, 7).replace("-", "") : new Date().toISOString().slice(0, 7).replace("-", "");
      const prefix = `CN-${month}-`;
      const lastCN = await CreditNote.findOne({
        where: { store_id, credit_note_number: { [Op.like]: `${prefix}%` } },
        order: [["id", "DESC"]],
        attributes: ["credit_note_number"],
        transaction: t,
      });
      let seq = 1;
      if (lastCN && lastCN.credit_note_number) {
        const parts = lastCN.credit_note_number.split("-");
        seq = parseInt(parts[parts.length - 1] || 0, 10) + 1;
      }
      const cnNumber = `${prefix}${String(seq).padStart(4, "0")}`;

      const creditNote = await CreditNote.create({
        store_id,
        credit_note_number: cnNumber,
        date: today,
        customer_id: cid,
        reference_invoice: sale ? sale.invoice_number || sale.id : null,
        payment_status: "Outstanding",
        currency: "INR",
        notes: `Sales return #${return_number}`,
        subtotal: final_refund,
        created_by: user_id,
      }, { transaction: t });

      await CreditNoteLine.bulkCreate(
        returnItems.map((ri) => ({
          credit_note_id: creditNote.id,
          description: ri.product_name || `Product #${ri.product_id}`,
          qty: parseFloat(ri.quantity) || 1,
          rate: parseFloat(ri.total_amount) / (parseFloat(ri.quantity) || 1),
          amount: parseFloat(ri.total_amount) || 0,
        })),
        { transaction: t },
      );
    }

    return { id: ret.id, return_number: ret.return_number, total_amount: ret.total_amount, items_count: returnItems.length };
  });

  // Audit log outside transaction — follows the same pattern as createSale()
  await auditLog.log({
    store_id,
    user_id,
    module: "returns",
    action: "create",
    reference_type: "return",
    reference_id: newRet.id,
    new_values: {
      return_number: newRet.return_number,
      total_amount: newRet.total_amount,
      refund_method,
      items_count: newRet.items_count,
    },
  });

  return getReturnById(newRet.id);
};

const VALID_RETURN_STATUSES = ["pending", "approved", "completed", "rejected"];

const updateReturnStatus = async (id, status, user_id, storeId = null) => {
  if (!VALID_RETURN_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Allowed: ${VALID_RETURN_STATUSES.join(", ")}`, 400);
  }

  const ret = await getReturnById(id, null, storeId);

  if (ret.status === status) throw new AppError(`Return is already ${status}`, 409);

  const oldStatus = ret.status;
  await sequelize.transaction(async (t) => {
    await ret.update({ status }, { transaction: t });
  });

  await auditLog.log({
    store_id: ret.store_id,
    user_id,
    module: "returns",
    action: "update_status",
    reference_type: "return",
    reference_id: id,
    old_values: { status: oldStatus },
    new_values: { status },
  });

  return getReturnById(id);
};

module.exports = {
  getAllReturns,
  getReturnById,
  createReturn,
  updateReturnStatus,
};
