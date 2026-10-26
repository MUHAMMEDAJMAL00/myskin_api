"use strict";

const {
  Quotation,
  QuotationItem,
  QuotationVersion,
  Sale,
  SaleItem,
  SalePayment,
  Product,
  Customer,
  Store,
  User,
  ProductInventory,
  ProductVariant,
  ProductBatch,
  StockMovement,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger   = require("../accountLedger/accountLedger.service");
const fLedger  = require("../shared/financialLedger.service");
const { generateInvoiceNumber } = require("../sales/sales.service");
const { Op } = require("sequelize");

// ─── Generate Quotation Number ────────────────────────────────────────────────
const generateQuotationNumber = async (store_id, t) => {
  const today = new Date();
  const prefix = `QUO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const opts = {
    where: { store_id, quotation_number: { [Op.like]: `${prefix}-%` } },
    order: [["id", "DESC"]],
    attributes: ["quotation_number"],
  };
  if (t) { opts.transaction = t; opts.lock = t.LOCK.UPDATE; }
  const last = await Quotation.findOne(opts);
  if (!last) return `${prefix}-0001`;
  const seq = parseInt(last.quotation_number.split("-").pop()) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, "0")}`;
};

// ─── Get All Quotations ───────────────────────────────────────────────────────
const getAllQuotations = async ({ store_id, page = 1, limit = 20, search, status } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { store_id };
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { quotation_number: { [Op.like]: `%${search}%` } },
      { "$Customer.name$": { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Quotation.findAndCountAll({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"], required: false },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: QuotationItem, as: "items", attributes: ["id"], required: false },
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

// ─── Get Quotation By ID ──────────────────────────────────────────────────────
const getQuotationById = async (id, t = null, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const quotation = await Quotation.findOne({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"], required: false },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: QuotationItem, as: "items", required: false, include: [{ model: ProductVariant, attributes: ["id", "variant_name"], required: false }] },
    ],
    transaction: t || undefined,
  });
  if (!quotation) throw new AppError("Quotation not found", 404);
  return quotation;
};

// ─── Get Quotation Version History ───────────────────────────────────────────
const getQuotationVersions = async (id, storeId = null) => {
  await getQuotationById(id, null, storeId);
  return QuotationVersion.findAll({
    where: { quotation_id: id },
    include: [
      { model: User, as: "changedBy", attributes: ["id", "name"], required: false },
    ],
    order: [["version_number", "DESC"]],
  });
};

// ─── Calculate Item Totals ────────────────────────────────────────────────────
const calcItem = (item, product) => {
  const unit_price = parseFloat(item.unit_price ?? product.selling_price);
  const item_subtotal = unit_price * parseFloat(item.quantity);
  const discount_amount = parseFloat(item.discount_amount || 0);
  const taxable_amount = item_subtotal - discount_amount;
  const tax_rate = parseFloat(item.tax_rate ?? product.tax_rate ?? 0);
  const tax_amount = (taxable_amount * tax_rate) / 100;
  const total_price = taxable_amount + tax_amount;
  return { unit_price, item_subtotal, discount_amount, tax_rate, tax_amount, total_price };
};

// ─── Create Quotation ─────────────────────────────────────────────────────────
const createQuotation = async (data, user_id) => {
  const { store_id, customer_id, customer_name, valid_until, notes, items } = data;

  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  if (customer_id) {
    const customer = await Customer.findByPk(customer_id, { attributes: ["id"] });
    if (!customer) throw new AppError("Customer not found", 404);
  }

  return sequelize.transaction(async (t) => {
    let subtotal = 0, total_tax = 0, total_disc = 0;
    const quotItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, {
        attributes: ["id", "name", "selling_price", "tax_rate"],
        transaction: t,
      });
      if (!product) throw new AppError(`Product ID ${item.product_id} not found`, 404);

      let variant_name = null;
      if (item.variant_id) {
        const variant = await ProductVariant.findByPk(item.variant_id, {
          attributes: ["id", "variant_name"],
          transaction: t,
        });
        variant_name = variant ? variant.variant_name : null;
      }

      const { unit_price, item_subtotal, discount_amount, tax_rate, tax_amount, total_price } =
        calcItem(item, product);

      subtotal += item_subtotal;
      total_tax += tax_amount;
      total_disc += discount_amount;

      quotItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: variant_name || item.product_name || product.name,
        quantity: item.quantity,
        unit_price,
        discount_amount,
        tax_rate,
        tax_amount,
        total_price,
      });
    }

    const total_amount = subtotal - total_disc + total_tax;
    const quotation_number = await generateQuotationNumber(store_id, t);

    const quotation = await Quotation.create(
      {
        quotation_number,
        store_id,
        user_id,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        valid_until: valid_until || null,
        status: "pending",
        subtotal,
        discount_amount: total_disc,
        tax_amount: total_tax,
        total_amount,
        notes: notes || null,
      },
      { transaction: t },
    );

    await QuotationItem.bulkCreate(
      quotItems.map((i) => ({ ...i, quotation_id: quotation.id })),
      { transaction: t },
    );

    await auditLog.log({
      store_id,
      user_id,
      module: "quotations",
      action: "create",
      reference_type: "quotation",
      reference_id: quotation.id,
      new_values: {
        quotation_number: quotation.quotation_number,
        total_amount: quotation.total_amount,
        items_count: quotItems.length,
      },
    });

    return getQuotationById(quotation.id, t, store_id);
  });
};

// ─── Update Quotation (with versioning) ──────────────────────────────────────
const updateQuotation = async (id, data, user_id, storeId = null) => {
  const { customer_id, customer_name, valid_until, notes, change_notes, items } = data;

  return sequelize.transaction(async (t) => {
    const quotation = await getQuotationById(id, t, storeId);

    if (quotation.status === "converted")
      throw new AppError("Converted quotation cannot be edited", 400);
    if (quotation.status === "cancelled")
      throw new AppError("Cancelled quotation cannot be edited", 400);
    if (quotation.status === "rejected")
      throw new AppError("Rejected quotation cannot be edited", 400);
    if (quotation.status === "expired")
      throw new AppError("Expired quotation cannot be edited", 400);

    // Save current state as a version snapshot before applying changes
    const versionCount = await QuotationVersion.count({ where: { quotation_id: id } });
    await QuotationVersion.create(
      {
        quotation_id: id,
        version_number: versionCount + 1,
        snapshot: JSON.stringify({ ...quotation.toJSON(), items: quotation.items }),
        changed_by: user_id,
        change_notes: change_notes || null,
      },
      { transaction: t },
    );

    let updates = {};

    if (items && items.length) {
      let subtotal = 0, total_tax = 0, total_disc = 0;
      const quotItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.product_id, {
          attributes: ["id", "name", "selling_price", "tax_rate"],
          transaction: t,
        });
        if (!product) throw new AppError(`Product ID ${item.product_id} not found`, 404);

        let variant_name = null;
        if (item.variant_id) {
          const variant = await ProductVariant.findByPk(item.variant_id, {
            attributes: ["id", "variant_name"],
            transaction: t,
          });
          variant_name = variant ? variant.variant_name : null;
        }

        const { unit_price, item_subtotal, discount_amount, tax_rate, tax_amount, total_price } =
          calcItem(item, product);

        subtotal += item_subtotal;
        total_tax += tax_amount;
        total_disc += discount_amount;

        quotItems.push({
          quotation_id: id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          product_name: variant_name || item.product_name || product.name,
          quantity: item.quantity,
          unit_price,
          discount_amount,
          tax_rate,
          tax_amount,
          total_price,
        });
      }

      await QuotationItem.destroy({ where: { quotation_id: id }, transaction: t });
      await QuotationItem.bulkCreate(quotItems, { transaction: t });

      updates = {
        subtotal,
        discount_amount: total_disc,
        tax_amount: total_tax,
        total_amount: subtotal - total_disc + total_tax,
      };
    }

    if (customer_id !== undefined) updates.customer_id = customer_id || null;
    if (customer_name !== undefined) updates.customer_name = customer_name || null;
    if (valid_until !== undefined) updates.valid_until = valid_until || null;
    if (notes !== undefined) updates.notes = notes || null;

    await Quotation.update(updates, { where: { id }, transaction: t });

    await auditLog.log({
      store_id: quotation.store_id,
      user_id,
      module: "quotations",
      action: "update",
      reference_type: "quotation",
      reference_id: id,
      old_values: { total_amount: quotation.total_amount },
      new_values: { version: versionCount + 1, ...updates },
    });

    return getQuotationById(id, t, storeId);
  });
};

// ─── Update Quotation Status ──────────────────────────────────────────────────
const updateQuotationStatus = async (id, status, user_id, store_id) => {
  const quotation = await getQuotationById(id, null, store_id);
  if (quotation.status === "converted")
    throw new AppError("Converted quotation status cannot be changed", 400);
  if (quotation.status === "cancelled")
    throw new AppError("Cancelled quotation status cannot be changed", 400);
  if (quotation.status === "rejected")
    throw new AppError("Rejected quotation status cannot be changed", 400);
  if (quotation.status === "expired")
    throw new AppError("Expired quotation status cannot be changed", 400);

  await Quotation.update({ status }, { where: { id } });

  await auditLog.log({
    store_id,
    user_id,
    module: "quotations",
    action: "update",
    reference_type: "quotation",
    reference_id: id,
    old_values: { status: quotation.status },
    new_values: { status },
  });

  return getQuotationById(id, null, store_id);
};

// ─── Convert Quotation to Sale ────────────────────────────────────────────────
const convertToSale = async (id, payment, user_id) => {
  return sequelize.transaction(async (t) => {
    const quotation = await getQuotationById(id, t);

    if (quotation.status === "converted")
      throw new AppError("Quotation already converted to sale", 400);
    if (quotation.status === "rejected")
      throw new AppError("Rejected quotation cannot be converted", 400);
    if (quotation.status === "expired")
      throw new AppError("Expired quotation cannot be converted", 400);
    if (quotation.status === "cancelled")
      throw new AppError("Cancelled quotation cannot be converted", 400);

    const store = await Store.findByPk(quotation.store_id, {
      attributes: ["id", "allow_negative_stock"],
      transaction: t,
    });
    const allowNegativeStock = !!store.allow_negative_stock;

    const items = quotation.items;
    let subtotal = 0, total_tax = 0, total_cost = 0;
    const saleItems = [];
    const pendingMovements = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, {
        attributes: ["id", "name", "sku", "is_service", "purchase_price"],
        transaction: t,
      });
      if (!product) throw new AppError(`Product ID ${item.product_id} not found`, 404);

      if (!product.is_service) {
        const inventory = await ProductInventory.findOne({
          where: { product_id: item.product_id, variant_id: item.variant_id || null, store_id: quotation.store_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!inventory || inventory.quantity == null) {
          throw new AppError(`No inventory record for ${product.name}`, 400);
        }

        const available = parseFloat(inventory.quantity);
        if (isNaN(available)) {
          throw new AppError(`Invalid inventory quantity for ${product.name}`, 400);
        }
        if (available < parseFloat(item.quantity) && !allowNegativeStock) {
          throw new AppError(
            `Insufficient stock for ${product.name}. Available: ${available}`,
            400,
          );
        }

        const qty_before = available;
        const qty_after = available - parseFloat(item.quantity);
        await inventory.update({ quantity: qty_after }, { transaction: t });

        let remaining_to_deduct = parseFloat(item.quantity);
        const active_batches = await ProductBatch.findAll({
          where: {
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            store_id: quotation.store_id,
            is_active: 1,
            current_quantity: { [Op.gt]: 0 },
          },
          order: [["expiry_date", "ASC"], ["id", "ASC"]],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        const batches_used = [];
        for (const batch of active_batches) {
          if (remaining_to_deduct <= 0) break;
          const batch_qty = parseFloat(batch.current_quantity);
          const deduct_from_this_batch = Math.min(batch_qty, remaining_to_deduct);
          await batch.update(
            { current_quantity: batch_qty - deduct_from_this_batch },
            { transaction: t },
          );
          batches_used.push({
            batch_id: batch.id,
            batch_number: batch.batch_number,
            quantity: deduct_from_this_batch,
          });
          remaining_to_deduct -= deduct_from_this_batch;
        }
        let notes = "";
        if (batches_used.length) {
          notes = `Batches: ${batches_used.map((b) => `${b.batch_number}(${b.quantity})`).join(", ")}`;
        }
        if (remaining_to_deduct > 0) {
          notes += (notes ? " | " : "") + `Backorder: ${remaining_to_deduct}`;
        }

        pendingMovements.push({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          store_id: quotation.store_id,
          user_id,
          movement_type: "sale",
          reference_type: "sale",
          quantity_before: qty_before,
          quantity_change: -parseFloat(item.quantity),
          quantity_after: qty_after,
          notes: notes || null,
        });
      }

      const purchasePrice = parseFloat(product.purchase_price || 0);
      subtotal += parseFloat(item.unit_price) * parseFloat(item.quantity);
      total_tax += parseFloat(item.tax_amount);
      total_cost += purchasePrice * parseFloat(item.quantity);
      saleItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        product_sku: product.sku || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: "flat",
        discount_value: parseFloat(item.discount_amount),
        discount_amount: parseFloat(item.discount_amount),
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        purchase_price: purchasePrice,
        total_price: item.total_price,
      });
    }

  if (!payment || typeof payment !== "object") payment = {};
  const paid_amount = parseFloat(payment.amount || 0);
  const due_amount = parseFloat(quotation.total_amount) - paid_amount;

    // Generate invoice number with transaction lock to prevent duplicates under concurrency
    const invoice_number = await generateInvoiceNumber(t);

    let payment_status = "unpaid";
    if (paid_amount >= parseFloat(quotation.total_amount)) payment_status = "paid";
    else if (paid_amount > 0) payment_status = "partial";

    const sale = await Sale.create(
      {
        invoice_number,
        store_id: quotation.store_id,
        user_id,
        customer_id: quotation.customer_id || null,
        quotation_id: quotation.id,
        status: "completed",
        subtotal,
        discount_type: "flat",
        discount_value: parseFloat(quotation.discount_amount),
        discount_amount: parseFloat(quotation.discount_amount),
        total_cost,
        tax_amount: total_tax,
        shipping_charge: 0,
        round_off: 0,
        total_amount: parseFloat(quotation.total_amount),
        paid_amount,
        due_amount,
        payment_status,
        notes: `Converted from quotation ${quotation.quotation_number}`,
      },
      { transaction: t },
    );

    // Stock movements — now that sale.id exists
    if (pendingMovements.length) {
      await StockMovement.bulkCreate(
        pendingMovements.map((m) => ({ ...m, reference_id: sale.id })),
        { transaction: t },
      );
    }

    await SaleItem.bulkCreate(
      saleItems.map((i) => ({ ...i, sale_id: sale.id })),
      { transaction: t },
    );

    if (paid_amount > 0) {
      await SalePayment.create(
        {
          sale_id: sale.id,
          payment_method: payment.payment_method || "cash",
          amount: paid_amount,
          payment_date: new Date(),
        },
        { transaction: t },
      );
    }

    await Quotation.update(
      { status: "converted", converted_sale_id: sale.id },
      { where: { id }, transaction: t },
    );

    // ─── Accounting entries (mirrors createSale) ──────────────────────────────
    const store_id   = quotation.store_id;
    const customer_id = quotation.customer_id || null;
    const total_amount = parseFloat(quotation.total_amount);
    const paymentsArr  = paid_amount > 0
      ? [{ payment_method: payment.payment_method || "cash", amount: paid_amount }]
      : [];

    if (customer_id && due_amount > 0) {
      await Customer.increment("balance", {
        by: parseFloat(due_amount.toFixed(2)),
        where: { id: customer_id },
        transaction: t,
      });
    }

    await ledger.recordSale({
      store_id,
      sale_id:        sale.id,
      customer_id,
      total_amount,
      paid_amount,
      payments:       paymentsArr,
      invoice_number: sale.invoice_number,
      sale_date:      new Date(),
      created_by:     user_id,
    }, t);

    const netAmt  = total_amount - total_tax;
    const jeLines = [];
    if (customer_id) {
      jeLines.push({ mappingKey: "default_debtor", debit: total_amount, credit: 0 });
      jeLines.push({ mappingKey: "sales_products", debit: 0, credit: total_tax > 0 ? netAmt : total_amount });
      if (total_tax > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: 0, credit: total_tax });
      if (paid_amount > 0) {
        const accName = fLedger.paymentMethodToMappingKey(payment.payment_method);
        jeLines.push({ mappingKey: accName,          debit: paid_amount, credit: 0 });
        jeLines.push({ mappingKey: "default_debtor", debit: 0,           credit: paid_amount });
      }
    } else {
      const accName = fLedger.paymentMethodToMappingKey(payment.payment_method || "cash");
      jeLines.push({ mappingKey: accName,          debit: total_amount, credit: 0 });
      jeLines.push({ mappingKey: "sales_products", debit: 0, credit: total_tax > 0 ? netAmt : total_amount });
      if (total_tax > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: 0, credit: total_tax });
    }
    if (total_cost > 0) {
      jeLines.push({ mappingKey: "cost_of_goods_sold", debit: total_cost, credit: 0 });
      jeLines.push({ mappingKey: "stock_in_hand",      debit: 0,          credit: total_cost });
    }
    await fLedger.postNamedJE({
      store_id, reference_type: "sale", reference_id: sale.id,
      date: new Date(), description: `Sale ${invoice_number} (from quotation)`,
      namedLines: jeLines, user_id,
    }, t);

    await auditLog.log({
      store_id: quotation.store_id,
      user_id,
      module: "quotations",
      action: "convert",
      reference_type: "quotation",
      reference_id: id,
      new_values: {
        sale_id: sale.id,
        invoice_number,
        total_amount: quotation.total_amount,
      },
    });

    return getQuotationById(id, t);
  });
};

module.exports = {
  getAllQuotations,
  getQuotationById,
  getQuotationVersions,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  convertToSale,
};
