"use strict";

const {
  Sale,
  SaleItem,
  SalePayment,
  Product,
  ProductVariant,
  Customer,
  Store,
  User,
  ProductInventory,
  ProductBatch,
  StockMovement,
  LoyaltyTransaction,
  OfferAuditLog,
  AccountLedger,
  StoreProductPrice,
  CashRegister,
  CashMovement,
  Return,
  TaxGroup,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");
const { incrementUsage } = require("../discounts/discount.service");
const configService = require("../config/config.service");
const { Op } = require("sequelize");

// ─── Generate Invoice Number ──────────────────────────────────────────────────
const generateInvoiceNumber = async (t = null) => {
  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const last = await Sale.findOne({
    where: { invoice_number: { [Op.like]: `${prefix}-%` } },
    order: [["id", "DESC"]],
    attributes: ["invoice_number"],
    ...(t ? { lock: t.LOCK.UPDATE, transaction: t } : {}),
  });
  if (!last) return `${prefix}-0001`;
  const seq = parseInt(last.invoice_number.split("-").pop()) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, "0")}`;
};

// ─── Calculate Item Totals ────────────────────────────────────────────────────
const calculateItem = (item) => {
  const subtotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
  let discount_amount = 0;

  if (item.discount_type === "flat") {
    discount_amount = parseFloat(item.discount_value || 0) * parseFloat(item.quantity);
  } else if (item.discount_type === "percent") {
    discount_amount = (subtotal * parseFloat(item.discount_value || 0)) / 100;
  }

  const after_discount = subtotal - discount_amount;
  const rate = parseFloat(item.tax_rate || 0);
  const tax_included = item.tax_included === 1;
  const invoice_tax_mode = item.invoice_tax_mode || "product";

  let tax_amount, total_price, base_price;

  if (invoice_tax_mode !== "product") {
    tax_amount = 0;
    total_price = after_discount;
    base_price = after_discount;
  } else if (tax_included && rate > 0) {
    tax_amount = (after_discount * rate) / (100 + rate);
    base_price = after_discount - tax_amount;
    total_price = after_discount;
  } else {
    tax_amount = (after_discount * rate) / 100;
    base_price = after_discount;
    total_price = after_discount + tax_amount;
  }

  return { discount_amount, tax_amount, total_price, base_price };
};

// ─── Compute tax breakdown (CGST/SGST) ──────────────────────────────────────
const computeTaxBreakdown = (totalTax, taxGroup) => {
  if (!totalTax || totalTax <= 0) return [];
  if (taxGroup && Array.isArray(taxGroup.components) && taxGroup.components.length) {
    const totalRate = taxGroup.components.reduce((s, c) => s + parseFloat(c.rate || 0), 0);
    if (totalRate <= 0) {
      const half = parseFloat((totalTax / 2).toFixed(2));
      return [
        { name: "CGST", amount: half },
        { name: "SGST", amount: totalTax - half },
      ];
    }
    return taxGroup.components.map((c) => ({
      name: c.name,
      rate: parseFloat(c.rate || 0),
      amount: parseFloat(((totalTax * parseFloat(c.rate || 0)) / totalRate).toFixed(2)),
    }));
  }
  const half = parseFloat((totalTax / 2).toFixed(2));
  return [
    { name: "CGST", amount: half },
    { name: "SGST", amount: totalTax - half },
  ];
};

// ─── Get All Sales ────────────────────────────────────────────────────────────
const getAllSales = async ({
  store_id,
  page = 1,
  limit = 20,
  search,
  status,
  payment_status,
  source,
  from,
  to,
} = {}) => {
  // For online orders, show across all stores (not filtered by admin's store scope)
  const where = (source === 'online') ? {} : (store_id ? { store_id } : {});
  if (status) where.status = status;
  if (payment_status) where.payment_status = payment_status;
  if (source) where.source = source;
  if (from || to) {
    where.sale_date = {};
    if (from) {
      where.sale_date[Op.gte] = from + " 00:00:00";
    }
    if (to) {
      where.sale_date[Op.lte] = to + " 23:59:59";
    }
  }
  if (search) {
    const customerIds = await Customer.findAll({
      where: { name: { [Op.like]: `%${search}%` } },
      attributes: ["id"],
      raw: true,
    }).then((rows) => rows.map((r) => r.id));

    where[Op.or] = [
      { invoice_number: { [Op.like]: `%${search}%` } },
    ];
    if (customerIds.length) {
      where[Op.or].push({ customer_id: { [Op.in]: customerIds } });
    }
  }
  const { count, rows } = await Sale.findAndCountAll({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"], required: false },
      { model: User, attributes: ["id", "name"], required: false },
      { model: Store, attributes: ["id", "name", "code"], required: false },
      { model: SaleItem, as: "items", attributes: ["id", "product_id", "product_name", "quantity", "unit_price", "total_price", "discount_amount", "tax_amount"], required: false },
      { model: TaxGroup, as: "TaxGroup", attributes: ["id", "name", "rate", "tax_type", "components"], required: false },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / limit),
    data: rows.map((sale) => {
      const s = sale.toJSON ? sale.toJSON() : sale;
      const revenue = parseFloat(s.total_amount || 0) - parseFloat(s.tax_amount || 0);
      const cost = parseFloat(s.total_cost || 0);
      s.total_profit = parseFloat((revenue - cost).toFixed(2));
      s.tax_breakdown = computeTaxBreakdown(parseFloat(s.tax_amount || 0), s.TaxGroup);
      return s;
    }),
  };
};

// ─── Get Sale By ID ───────────────────────────────────────────────────────────
const getSaleById = async (id, t = null, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const options = {
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"] },
      { model: User, attributes: ["id", "name"] },
      { model: Store, attributes: ["id", "name", "code"] },
      {
        model: SaleItem,
        as: "items",
        include: [
          /* Fallback: if product_name was not stored on the row, pull from Product */
          { model: Product, attributes: ["id", "name", "sku"], required: false },
          { model: ProductVariant, attributes: ["id", "variant_name", "sku", "selling_price"], required: false },
        ],
      },
      { model: SalePayment, as: "payments" },
      { model: TaxGroup, as: "TaxGroup", attributes: ["id", "name", "rate", "tax_type", "components"], required: false },
    ],
  };
  if (t) options.transaction = t;

  const sale = await Sale.findOne(options);
  if (!sale) throw new AppError("Sale not found", 404);

  const plain = sale.toJSON ? sale.toJSON() : sale;
  if (plain.items) {
    plain.items = plain.items.map((item) => {
      const cost = parseFloat(item.purchase_price || 0) * parseFloat(item.quantity || 0);
      const revenue = parseFloat(item.total_price || 0) - parseFloat(item.tax_amount || 0);
      return { ...item, cost: parseFloat(cost.toFixed(2)), profit: parseFloat((revenue - cost).toFixed(2)) };
    });
  }
  const totalRevenue = parseFloat(plain.total_amount || 0) - parseFloat(plain.tax_amount || 0);
  const totalCost = parseFloat(plain.total_cost || 0);
  plain.total_profit = parseFloat((totalRevenue - totalCost).toFixed(2));
  plain.tax_breakdown = computeTaxBreakdown(parseFloat(plain.tax_amount || 0), plain.TaxGroup);

  return plain;
};

// ─── Create Sale ──────────────────────────────────────────────────────────────
const createSale = async (data, user_id) => {
  const {
    store_id,
    customer_id,
    items,
    payments,
    discount_type,
    discount_value,
    promo_discount_id,
    promo_discount_amount,
    shipping_charge,
    notes,
    status,
    sale_date,
    invoice_tax_mode = "product",
    invoice_tax_group_id = null,
    source = "pos",
  } = data;

  // Validate store and read negative-stock setting
  const store = await Store.findByPk(store_id, {
    attributes: ["id", "allow_negative_stock"],
  });
  if (!store) throw new AppError("Store not found", 404);
  const allowNegativeStock = !!store.allow_negative_stock;

  // Validate customer if provided
  if (customer_id) {
    const customer = await Customer.findByPk(customer_id, {
      attributes: ["id"],
    });
    if (!customer) throw new AppError("Customer not found", 404);
  }

  if (invoice_tax_mode === "invoice" && !invoice_tax_group_id) {
    throw new AppError("Invoice Tax mode requires a Tax Group selection", 400);
  }

  const newSale = await sequelize.transaction(async (t) => {
    const saleStatus = status || "completed";
    const isPendingOnline = saleStatus === "pending" && source === "online";
    let subtotal = 0;
    let total_tax = 0;
    let total_item_disc = 0;
    let total_cost = 0;
    const saleItems = [];
    const pendingMovements = []; // collected here; created after Sale exists so reference_id is available

    // Process each item
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, {
        attributes: [
          "id",
          "name",
          "sku",
          "selling_price",
          "tax_rate",
          "is_service",
          "tax_included",
          "purchase_price",
        ],
        transaction: t,
      });
      if (!product)
        throw new AppError(`Product ID ${item.product_id} not found`, 404);

      let variant = null;
      if (item.variant_id) {
        variant = await ProductVariant.findByPk(item.variant_id, {
          attributes: ["id", "variant_name", "sku", "purchase_price", "selling_price"],
          transaction: t,
        });
      }

      // Price resolution order: store override → product default → item.unit_price
      if (item.unit_price == null || item.unit_price === 0) {
        const storePrice = await StoreProductPrice.findOne({
          where: { store_id, product_id: item.product_id },
          transaction: t,
        });
        item.unit_price = storePrice ? parseFloat(storePrice.price) : parseFloat(product.selling_price);
      }

      // Check and deduct inventory (skip service products, drafts, and pending online orders)
      const shouldCheckStock = !product.is_service && (saleStatus === "completed" || isPendingOnline);
      if (shouldCheckStock) {
        const variantId = item.variant_id || null;
        const inventory = await ProductInventory.findOne({
          where: { product_id: item.product_id, variant_id: variantId, store_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        /* No inventory record = not tracked for this store; skip stock check */
        if (inventory) {
          const available = parseFloat(inventory.quantity);
          const requested_qty = parseFloat(item.quantity);

          if (available < requested_qty && !allowNegativeStock) {
            throw new AppError(
              `Insufficient stock for ${product.name}. Available: ${available}`,
              400,
            );
          }

          // Only deduct stock for completed/confirmed sales (not pending online orders)
          if (!isPendingOnline) {
            const qty_before = available;
            const qty_after = available - requested_qty;
            const isBackorder = qty_after < 0;

            await inventory.update({ quantity: qty_after }, { transaction: t });

            // --- FIFO Batch Deduction ---
            let remaining_to_deduct = requested_qty;
            const active_batches = await ProductBatch.findAll({
              where: {
                product_id: item.product_id,
                variant_id: variantId,
                store_id,
                is_active: 1,
                current_quantity: { [Op.gt]: 0 },
              },
              order: [
                ["expiry_date", "ASC"],
                ["id", "ASC"],
              ],
              transaction: t,
              lock: t.LOCK.UPDATE,
            });

            const batches_used = [];

            for (const batch of active_batches) {
              if (remaining_to_deduct <= 0) break;

              const batch_qty = parseFloat(batch.current_quantity);
              const deduct_from_this_batch = Math.min(batch_qty, remaining_to_deduct);

              await batch.update(
                {
                  current_quantity: batch_qty - deduct_from_this_batch,
                },
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
              variant_id: variantId,
              store_id,
              user_id,
              movement_type: "sale",
              reference_type: "sale",
              quantity_before: qty_before,
              quantity_change: -requested_qty,
              quantity_after: qty_after,
              is_backorder: isBackorder ? 1 : 0,
              notes,
            });
          }
        }
      }

      const { discount_amount, tax_amount, total_price, base_price } = calculateItem({
        ...item,
        tax_rate: item.tax_rate ?? product.tax_rate,
        tax_included: product.tax_included,
        invoice_tax_mode,
      });

      subtotal += base_price;
      total_tax += tax_amount;
      total_item_disc += discount_amount;
      total_cost += parseFloat((variant ? variant.purchase_price : product.purchase_price) || 0) * parseFloat(item.quantity);

      saleItems.push({
        product_id: product.id,
        variant_id: item.variant_id || null,
        product_name: variant ? variant.variant_name : product.name,
        product_sku: variant ? variant.sku : product.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: item.discount_type || "none",
        discount_value: item.discount_value || 0,
        discount_amount,
        tax_rate: item.tax_rate ?? product.tax_rate,
        tax_amount,
        total_price,
        purchase_price: parseFloat((variant ? variant.purchase_price : product.purchase_price) || 0),
      });
    }

    // Sale-level discount (manual cashier input)
    let sale_discount = 0;
    if (discount_type === "flat") {
      sale_discount = parseFloat(discount_value || 0);
    } else if (discount_type === "percent") {
      sale_discount = (subtotal * parseFloat(discount_value || 0)) / 100;
    }

    // Promo code discount (from discount engine)
    const promo_discount = Math.min(parseFloat(promo_discount_amount || 0), subtotal);

    const taxable_base = subtotal - sale_discount - promo_discount;

    let invoice_tax_percentage = null;
    let invoice_tax_amount = null;
    let invoice_tax_exclusive = true;

    if (invoice_tax_mode === "invoice" && invoice_tax_group_id) {
      const taxGroup = await TaxGroup.findByPk(invoice_tax_group_id, {
        attributes: ["id", "rate", "tax_type", "store_id"],
        transaction: t,
      });
      if (taxGroup) {
        if (taxGroup.store_id && parseInt(taxGroup.store_id) !== parseInt(store_id)) {
          throw new AppError("Tax group does not belong to this store", 400);
        }
        invoice_tax_exclusive = taxGroup.tax_type === "exclusive";
        invoice_tax_percentage = parseFloat(taxGroup.rate);
        invoice_tax_amount = invoice_tax_exclusive
          ? (taxable_base * invoice_tax_percentage) / 100
          : (taxable_base * invoice_tax_percentage) / (100 + invoice_tax_percentage);
        total_tax = invoice_tax_amount;
      }
    } else if (invoice_tax_mode === "exempt") {
      total_tax = 0;
    }

    const shipping = parseFloat(shipping_charge || 0);
    const raw_total = invoice_tax_mode === "invoice" && invoice_tax_group_id
      ? taxable_base + (invoice_tax_exclusive ? total_tax : 0) + shipping
      : taxable_base + total_tax + shipping;
    const round_off = Math.round(raw_total) - raw_total;
    const total_amount = raw_total + round_off;

    // Payment totals
    const paid_amount = payments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0,
    );
    const due_amount = total_amount - paid_amount;

    let payment_status = "unpaid";
    if (paid_amount >= total_amount) payment_status = "paid";
    else if (paid_amount > 0) payment_status = "partial";

    // Credit limit enforcement for credit sales (skip pending online orders)
    if (customer_id && due_amount > 0 && !isPendingOnline) {
        const cust = await Customer.findByPk(customer_id, {
          attributes: ["id", "balance", "credit_limit"],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      if (cust && cust.credit_limit !== null) {
        const projected = parseFloat(cust.balance || 0) + parseFloat(due_amount);
        if (projected > parseFloat(cust.credit_limit)) {
          throw new AppError(
            `Credit limit exceeded. Limit: ₹${cust.credit_limit}, Current balance: ₹${parseFloat(cust.balance || 0).toFixed(2)}, Additional due: ₹${parseFloat(due_amount).toFixed(2)}`,
            400,
          );
        }
      }
    }

    // Generate invoice number (inside transaction with lock — prevents duplicates)
    const invoice_number = await generateInvoiceNumber(t);

    // Create sale
    const sale = await Sale.create(
      {
        invoice_number,
        store_id,
        user_id,
        customer_id: customer_id || null,
        sale_date: sale_date || new Date(),
        status: status || "completed",
        source,
        subtotal,
        discount_type: discount_type || "none",
        discount_value: discount_value || 0,
        discount_amount: sale_discount + promo_discount + total_item_disc,
        tax_amount: total_tax,
        shipping_charge: shipping,
        round_off,
        total_amount,
        total_cost,
        paid_amount,
        due_amount,
        payment_status,
        notes: notes || null,
        invoice_tax_mode,
        invoice_tax_group_id,
        invoice_tax_percentage,
        invoice_tax_amount,
      },
      { transaction: t },
    );

    // Create stock movements now that we have the sale id
    if (pendingMovements.length) {
      await StockMovement.bulkCreate(
        pendingMovements.map((m) => ({ ...m, reference_id: sale.id })),
        { transaction: t },
      );
    }

    // Create sale items
    await SaleItem.bulkCreate(
      saleItems.map((i) => ({ ...i, sale_id: sale.id })),
      { transaction: t },
    );

    // Create payments
    await SalePayment.bulkCreate(
      payments.map((p) => ({
        sale_id: sale.id,
        payment_method: p.payment_method,
        payment_source_name: p.payment_source_name || null,
        amount: p.amount,
        reference_number: p.reference_number || null,
        notes: p.notes || null,
        payment_date: new Date(),
      })),
      { transaction: t },
    );

    // ─── For pending online orders, skip cash register, loyalty, ledger, etc. ──
    if (!isPendingOnline) {

      // ─── Update Cash Register for cash payments ───────────────────────────
      const cashPayments = (payments || []).filter(
        (p) => (p.payment_method || "").toLowerCase() === "cash",
      );
      if (cashPayments.length > 0) {
        const cashTotal = cashPayments.reduce(
          (s, p) => s + parseFloat(p.amount || 0),
          0,
        );
          const register = await CashRegister.findOne({
            where: { store_id, status: "open" },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
        if (register) {
          const newBalance =
            parseFloat(register.expected_balance) + cashTotal;
          await register.update(
            { expected_balance: newBalance },
            { transaction: t },
          );
          await CashMovement.create(
            {
              cash_register_id: register.id,
              store_id,
              user_id,
              movement_type: "cash_in",
              amount: cashTotal,
              reference_type: "sale",
              reference_id: sale.id,
              notes: `Cash sale ${sale.invoice_number}`,
            },
            { transaction: t },
          );
        }
      }

      // Increment discount usage count if a promo code was applied
      if (promo_discount_id && promo_discount > 0) {
        await incrementUsage(promo_discount_id, t);

        await OfferAuditLog.create(
          {
            store_id:        store_id,
            sale_id:         sale.id,
            offer_id:        promo_discount_id,
            product_id:      null,
            quantity:        null,
            base_amount:     parseFloat(subtotal.toFixed(2)),
            discount_amount: parseFloat(promo_discount.toFixed(2)),
            final_amount:    parseFloat((subtotal - promo_discount).toFixed(2)),
            trigger_source:  "code",
            tax_applied_before: 1,
            conflict_resolution: null,
            is_refunded:     0,
          },
          { transaction: t },
        );
      }

      // Update customer balance for credit sales
      if (customer_id && due_amount > 0) {
        await Customer.increment("balance", {
          by: parseFloat(due_amount.toFixed(2)),
          where: { id: customer_id },
          transaction: t,
        });
      }

      // ─── Loyalty Points: Burn + Earn ─────────────────────────────────────────
      if (customer_id && (status || "completed") === "completed") {
        const loyaltyPayment = payments.find(
          (p) => p.payment_method === "loyalty_points",
        );

        if (loyaltyPayment) {
          let redeemRate = 1;
          const rcfg = await configService.getConfig("loyalty_redeem_rate", store_id || null);
          if (rcfg && rcfg.parsed_value) {
            const r = parseFloat(rcfg.parsed_value);
            if (!isNaN(r) && r > 0) redeemRate = r;
          }
          const pointsToRedeem = Math.round(parseFloat(loyaltyPayment.amount) * redeemRate);
          const customer = await Customer.findByPk(customer_id, {
            attributes: ["loyalty_points"],
            transaction: t,
          });
          const available = parseInt(customer.loyalty_points) || 0;
          if (available < pointsToRedeem) {
            throw new AppError(
              `Insufficient loyalty points. Available: ${available}, required: ${pointsToRedeem}`,
              400,
            );
          }
          const balance_after = available - pointsToRedeem;
          await Customer.decrement("loyalty_points", {
            by: pointsToRedeem,
            where: { id: customer_id },
            transaction: t,
          });
          await LoyaltyTransaction.create(
            {
              customer_id,
              sale_id: sale.id,
              transaction_type: "redeem",
              points: -pointsToRedeem,
              balance_after,
              notes: `Points redeemed for sale ${sale.invoice_number}`,
            },
            { transaction: t },
          );
        }

        let earnRate = 1;
        const cfg = await configService.getConfig("loyalty_earn_rate", store_id || null);
        if (cfg && cfg.parsed_value) {
          const rate = parseFloat(cfg.parsed_value);
          if (!isNaN(rate) && rate > 0) earnRate = rate;
        }
        const earnedPoints = Math.floor(subtotal * earnRate);
        if (earnedPoints > 0) {
          const customer = await Customer.findByPk(customer_id, {
            attributes: ["loyalty_points"],
            transaction: t,
          });
          const currentPoints = parseInt(customer.loyalty_points) || 0;
          const balance_after = currentPoints + earnedPoints;
          await Customer.increment("loyalty_points", {
            by: earnedPoints,
            where: { id: customer_id },
            transaction: t,
          });
          await LoyaltyTransaction.create(
            {
              customer_id,
              sale_id: sale.id,
              transaction_type: "earn",
              points: earnedPoints,
              balance_after,
              notes: `Points earned for sale ${sale.invoice_number}`,
            },
            { transaction: t },
          );
        }
      }

      // ─── Account Ledger + Journal Entry ──────────────────────────────────────
      if ((status || "completed") === "completed") {
        await ledger.recordSale(
          {
            store_id,
            sale_id: sale.id,
            customer_id,
            total_amount,
            paid_amount,
            payments,
            invoice_number: sale.invoice_number,
            sale_date: sale.sale_date,
            created_by: user_id,
          },
          t,
        );

        const jeLines  = [];
        const taxAmt   = parseFloat(sale.tax_amount || 0);
        const netSales = taxAmt > 0 ? total_amount - taxAmt : total_amount;

        if (customer_id) {
          jeLines.push({ mappingKey: "default_debtor", debit: total_amount, credit: 0 });
          jeLines.push({ mappingKey: "sales_products", debit: 0, credit: netSales });
          if (taxAmt > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: 0, credit: taxAmt });
          for (const p of payments || []) {
            const mappingKey = fLedger.paymentMethodToMappingKey(p.payment_method);
            jeLines.push({ mappingKey,          debit: parseFloat(p.amount), credit: 0 });
            jeLines.push({ mappingKey: "default_debtor", debit: 0, credit: parseFloat(p.amount) });
          }
        } else {
          const mappingKey = fLedger.paymentMethodToMappingKey((payments[0] || {}).payment_method);
          jeLines.push({ mappingKey,          debit: total_amount, credit: 0 });
          jeLines.push({ mappingKey: "sales_products", debit: 0, credit: netSales });
          if (taxAmt > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: 0, credit: taxAmt });
        }
        if (total_cost > 0) {
          jeLines.push({ mappingKey: "cost_of_goods_sold", debit: total_cost, credit: 0 });
          jeLines.push({ mappingKey: "stock_in_hand",      debit: 0,          credit: total_cost });
        }
        await fLedger.postNamedJE({
          store_id, reference_type: "sale", reference_id: sale.id,
          date: sale.sale_date, description: `Sale ${sale.invoice_number}`,
          namedLines: jeLines, user_id,
        }, t);

      }
    }

    return { id: sale.id, invoice_number: sale.invoice_number, total_amount: sale.total_amount, status: sale.status, source: sale.source, items_count: saleItems.length };
  });

  // ─── Audit Log ────────────────────────────────────────────────────────────
  await auditLog.log({
    store_id,
    user_id,
    module: "sales",
    action: "create",
    reference_type: "sale",
    reference_id: newSale.id,
    new_values: {
      invoice_number: newSale.invoice_number,
      total_amount: newSale.total_amount,
      status: newSale.status,
      items_count: newSale.items_count,
    },
  });

  return getSaleById(newSale.id);
};

// ─── Get Sale By Invoice Number ───────────────────────────────────────────────
const getByInvoiceNumber = async (invoice_number, store_id = null) => {
  const where = { invoice_number };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const sale = await Sale.findOne({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"] },
      { model: User, attributes: ["id", "name"] },
      { model: Store, attributes: ["id", "name", "code"] },
      {
        model: SaleItem,
        as: "items",
        include: [
          { model: Product, attributes: ["id", "name", "sku"], required: false },
          { model: ProductVariant, attributes: ["id", "variant_name", "sku", "selling_price"], required: false },
        ],
      },
      { model: SalePayment, as: "payments" },
      { model: TaxGroup, as: "TaxGroup", attributes: ["id", "name", "rate", "tax_type", "components"], required: false },
    ],
  });
  if (!sale) throw new AppError("Sale not found", 404);
  const plain = sale.toJSON ? sale.toJSON() : sale;
  plain.tax_breakdown = computeTaxBreakdown(parseFloat(plain.tax_amount || 0), plain.TaxGroup);
  return plain;
};

// ─── Execute stock deduction only (for pending → completed) ────────────
const executeStockActions = async (sale, user_id, store_id, t) => {
  const items = sale.items || [];
  const pendingMovements = [];

  const store = await Store.findByPk(store_id, {
    attributes: ["id", "allow_negative_stock"],
    transaction: t,
  });
  const allowNegativeStock = !!store?.allow_negative_stock;

  for (const item of items) {
    if (!item.product_id) continue;
    const variantId = item.variant_id || null;
    const inventory = await ProductInventory.findOne({
      where: { product_id: item.product_id, variant_id: variantId, store_id },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!inventory) continue;

    const available = parseFloat(inventory.quantity);
    const requested_qty = parseFloat(item.quantity);
    if (available < requested_qty && !allowNegativeStock) {
      throw new AppError(`Insufficient stock for ${item.product_name}. Available: ${available}`, 400);
    }

    const qty_before = available;
    const qty_after = available - requested_qty;
    const isBackorder = qty_after < 0;
    await inventory.update({ quantity: qty_after }, { transaction: t });

    let remaining_to_deduct = requested_qty;
    const active_batches = await ProductBatch.findAll({
      where: { product_id: item.product_id, variant_id: variantId, store_id, is_active: 1, current_quantity: { [Op.gt]: 0 } },
      order: [["expiry_date", "ASC"], ["id", "ASC"]],
      transaction: t, lock: t.LOCK.UPDATE,
    });

    const batches_used = [];
    for (const batch of active_batches) {
      if (remaining_to_deduct <= 0) break;
      const batch_qty = parseFloat(batch.current_quantity);
      const deduct_from_this_batch = Math.min(batch_qty, remaining_to_deduct);
      await batch.update({ current_quantity: batch_qty - deduct_from_this_batch }, { transaction: t });
      batches_used.push({ batch_id: batch.id, batch_number: batch.batch_number, quantity: deduct_from_this_batch });
      remaining_to_deduct -= deduct_from_this_batch;
    }

    let notes = "";
    if (batches_used.length) notes = `Batches: ${batches_used.map((b) => `${b.batch_number}(${b.quantity})`).join(", ")}`;
    if (remaining_to_deduct > 0) notes += (notes ? " | " : "") + `Backorder: ${remaining_to_deduct}`;

    pendingMovements.push({
      product_id: item.product_id, variant_id: variantId, store_id, user_id,
      movement_type: "sale", reference_type: "sale",
      quantity_before: qty_before, quantity_change: -requested_qty, quantity_after: qty_after,
      is_backorder: isBackorder ? 1 : 0, notes,
    });
  }

  if (pendingMovements.length) {
    await StockMovement.bulkCreate(pendingMovements, { transaction: t });
  }
};

// ─── Execute financial actions (journal, ledger, loyalty, payment) ──────
const executeFinancialActions = async (sale, user_id, store_id, t, markPaid = false) => {
  // Update customer balance
  const dueAmt = parseFloat(sale.due_amount || 0);
  if (sale.customer_id && dueAmt > 0) {
    await Customer.increment("balance", { by: parseFloat(dueAmt.toFixed(2)), where: { id: sale.customer_id }, transaction: t });
  }

  // Loyalty points
  if (sale.customer_id) {
    const payments = sale.payments || [];
    const loyaltyPayment = payments.find((p) => p.payment_method === "loyalty_points");
    if (loyaltyPayment) {
      let redeemRate = 1;
      const rcfg = await configService.getConfig("loyalty_redeem_rate", store_id || null);
      if (rcfg && rcfg.parsed_value) { const r = parseFloat(rcfg.parsed_value); if (!isNaN(r) && r > 0) redeemRate = r; }
      const pointsToRedeem = Math.round(parseFloat(loyaltyPayment.amount) * redeemRate);
      const customer = await Customer.findByPk(sale.customer_id, { attributes: ["loyalty_points"], transaction: t });
      const available = parseInt(customer.loyalty_points) || 0;
      if (available < pointsToRedeem) throw new AppError(`Insufficient loyalty points. Available: ${available}, required: ${pointsToRedeem}`, 400);
      const balance_after = available - pointsToRedeem;
      await Customer.decrement("loyalty_points", { by: pointsToRedeem, where: { id: sale.customer_id }, transaction: t });
      await LoyaltyTransaction.create({ customer_id: sale.customer_id, sale_id: sale.id, transaction_type: "redeem", points: -pointsToRedeem, balance_after, notes: `Points redeemed for sale ${sale.invoice_number}` }, { transaction: t });
    }

    let earnRate = 1;
    const cfg = await configService.getConfig("loyalty_earn_rate", store_id || null);
    if (cfg && cfg.parsed_value) { const rate = parseFloat(cfg.parsed_value); if (!isNaN(rate) && rate > 0) earnRate = rate; }
    const earnedPoints = Math.floor(parseFloat(sale.subtotal || 0) * earnRate);
    if (earnedPoints > 0) {
      const customer = await Customer.findByPk(sale.customer_id, { attributes: ["loyalty_points"], transaction: t });
      const currentPoints = parseInt(customer.loyalty_points) || 0;
      await Customer.increment("loyalty_points", { by: earnedPoints, where: { id: sale.customer_id }, transaction: t });
      await LoyaltyTransaction.create({ customer_id: sale.customer_id, sale_id: sale.id, transaction_type: "earn", points: earnedPoints, balance_after: currentPoints + earnedPoints, notes: `Points earned for sale ${sale.invoice_number}` }, { transaction: t });
    }
  }

  // If delivered via COD, mark payment as paid (customer pays on delivery)
  if (markPaid) {
    const totalAmt = parseFloat(sale.total_amount);
    await Sale.update({ paid_amount: totalAmt, due_amount: 0, payment_status: "paid" }, { where: { id: sale.id }, transaction: t });
    // Record a cash payment for the full amount
    await SalePayment.create({ sale_id: sale.id, payment_method: "cash", amount: totalAmt, payment_date: new Date(), notes: "COD - paid on delivery" }, { transaction: t });
  }

  // Account ledger + journal entry
  const currentSale = markPaid ? { ...sale.toJSON?.() || sale, paid_amount: sale.total_amount, due_amount: 0, payment_status: "paid" } : sale;
  const totalAmt = parseFloat(currentSale.total_amount);
  const payAmt = parseFloat(currentSale.paid_amount || 0);

  await ledger.recordSale({
    store_id, sale_id: sale.id, customer_id: sale.customer_id,
    total_amount: totalAmt, paid_amount: payAmt,
    payments: currentSale.payments || [],
    invoice_number: sale.invoice_number, sale_date: sale.sale_date, created_by: user_id,
  }, t);

  const totalCost = parseFloat(sale.total_cost || 0);
  const taxAmt = parseFloat(sale.tax_amount || 0);
  const netSales = taxAmt > 0 ? totalAmt - taxAmt : totalAmt;
  const jeLines = [];

  if (sale.customer_id) {
    jeLines.push({ mappingKey: "default_debtor", debit: totalAmt, credit: 0 });
    jeLines.push({ mappingKey: "sales_products", debit: 0, credit: netSales });
    if (taxAmt > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: 0, credit: taxAmt });
    if (payAmt > 0) {
      const mappingKey = fLedger.paymentMethodToMappingKey(markPaid ? "cash" : (currentSale.payments?.[0]?.payment_method || "cash"));
      jeLines.push({ mappingKey, debit: payAmt, credit: 0 });
      jeLines.push({ mappingKey: "default_debtor", debit: 0, credit: payAmt });
    }
  } else {
    const mappingKey = fLedger.paymentMethodToMappingKey(markPaid ? "cash" : (currentSale.payments?.[0]?.payment_method || "cash"));
    jeLines.push({ mappingKey, debit: totalAmt, credit: 0 });
    jeLines.push({ mappingKey: "sales_products", debit: 0, credit: netSales });
    if (taxAmt > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: 0, credit: taxAmt });
  }
  if (totalCost > 0) {
    jeLines.push({ mappingKey: "cost_of_goods_sold", debit: totalCost, credit: 0 });
    jeLines.push({ mappingKey: "stock_in_hand", debit: 0, credit: totalCost });
  }
  await fLedger.postNamedJE({
    store_id, reference_type: "sale", reference_id: sale.id,
    date: sale.sale_date, description: `Sale ${sale.invoice_number}`,
    namedLines: jeLines, user_id,
  }, t);
};

// ─── Statuses where stock has been deducted ───────────────────────────────────
const ACTIVE_STATUSES = ["completed", "confirmed", "processing", "shipped", "delivered"];

// ─── Update Sale Status ───────────────────────────────────────────────────────
const updateSaleStatus = async (id, status, user_id, store_id, cancel_notes = "") => {
  if (status === "cancelled") {
    const returnCount = await Return.count({
      where: { sale_id: id, store_id, status: { [Op.ne]: "cancelled" } },
    });
    if (returnCount > 0) {
      throw new AppError(
        "Cannot cancel this sale — it has active returns. Void the returns first.",
        400,
      );
    }
  }

  let old;
  await sequelize.transaction(async (t) => {
    old = await Sale.findByPk(id, {
      include: [
        { model: SaleItem, as: "items" },
        { model: SalePayment, as: "payments" },
      ],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!old) throw new AppError("Sale not found", 404);
    if (old.status === status) return;

    // ── Forward actions ──────────────────────────────────────────────────────────
    const isReversal = status === "cancelled" && ACTIVE_STATUSES.includes(old.status);

    await Sale.update({ status }, { where: { id, store_id, status: { [Op.ne]: status } }, transaction: t });

    if (old.status === "pending") {
      if (status === "delivered") {
        // pending → delivered: stock + financial + mark paid
        await executeStockActions(old, user_id, store_id, t);
        await executeFinancialActions(old, user_id, store_id, t, true);
      } else if (ACTIVE_STATUSES.includes(status)) {
        // pending → completed/processing/shipped: stock only
        await executeStockActions(old, user_id, store_id, t);
      }
    } else if (status === "delivered" && ACTIVE_STATUSES.includes(old.status) && old.status !== "delivered") {
      // completed/processing/shipped → delivered: financial + mark paid (stock already deducted)
      await executeFinancialActions(old, user_id, store_id, t, true);
    }

    if (isReversal) {
      const items = old.items || [];
      const pendingMovements = [];

      for (const item of items) {
        if (!item.product_id) continue;
        const variantId = item.variant_id || null;
        const inventory = await ProductInventory.findOne({
          where: { product_id: item.product_id, variant_id: variantId, store_id },
          transaction: t, lock: t.LOCK.UPDATE,
        });

        if (inventory) {
          const qty_before = parseFloat(inventory.quantity);
          const qty_restore = parseFloat(item.quantity);
          const qty_after = qty_before + qty_restore;
          await inventory.update({ quantity: qty_after }, { transaction: t });

          let rem = qty_restore;
          const restoreBatches = await ProductBatch.findAll({
            where: { product_id: item.product_id, variant_id: variantId, store_id, is_active: 1 },
            order: [["expiry_date", "DESC"], ["id", "DESC"]],
            transaction: t, lock: t.LOCK.UPDATE,
          });
          for (const b of restoreBatches) {
            if (rem <= 0) break;
            await b.update({ current_quantity: parseFloat(b.current_quantity) + rem }, { transaction: t });
            rem = 0;
          }

          pendingMovements.push({
            product_id: item.product_id, variant_id: variantId, store_id, user_id,
            movement_type: "sale_reversal", reference_type: "sale",
            quantity_before: qty_before, quantity_change: qty_restore, quantity_after: qty_after,
            notes: `Cancel sale ${old.invoice_number} — stock restored`,
          });
        }
      }

      if (pendingMovements.length) {
        await StockMovement.bulkCreate(pendingMovements, { transaction: t });
      }

      const dueAmt = parseFloat(old.due_amount || 0);
      if (old.customer_id && dueAmt > 0) {
        await Customer.decrement("balance", { by: dueAmt, where: { id: old.customer_id }, transaction: t });
      }

      await AccountLedger.destroy({ where: { reference_type: "sales", reference_id: id }, transaction: t });

      const totalAmt = parseFloat(old.total_amount);
      const taxAmt = parseFloat(old.tax_amount || 0);
      const netAmt = taxAmt > 0 ? totalAmt - taxAmt : totalAmt;
      const jeLines = [];
      if (old.customer_id) {
        jeLines.push({ mappingKey: "sales_products", debit: netAmt, credit: 0 });
        if (taxAmt > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: taxAmt, credit: 0 });
        jeLines.push({ mappingKey: "default_debtor", debit: 0, credit: totalAmt });
      } else {
        const mappingKey = fLedger.paymentMethodToMappingKey((old.payments?.[0] || {}).payment_method);
        jeLines.push({ mappingKey: "sales_products", debit: netAmt, credit: 0 });
        if (taxAmt > 0) jeLines.push({ mappingKey: "sale_tax_payable", debit: taxAmt, credit: 0 });
        jeLines.push({ mappingKey, debit: 0, credit: totalAmt });
      }
      await fLedger.postNamedJE({
        store_id, reference_type: "sale_reversal", reference_id: id,
        date: new Date(), description: `Sale ${old.invoice_number} ${status}`,
        namedLines: jeLines, user_id,
      }, t);
    }
  });

  await auditLog.log({
    store_id, user_id, module: "sales", action: "update",
    reference_type: "sale", reference_id: id,
    old_values: { status: old.status },
    new_values: cancel_notes ? { status, cancel_reason: cancel_notes } : { status },
  });

  return getSaleById(id);
};

// ─── Add Payment To Existing Sale ────────────────────────────────────────────
const addPaymentToSale = async (id, data, user_id, store_id = null) => {
  const { payment_method, amount, reference_number, notes, payment_date } = data;

  const where = { id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const payAmount = parseFloat(amount);

  const sale = await sequelize.transaction(async (t) => {
    const sale = await Sale.findOne({ where, lock: t.LOCK.UPDATE, transaction: t });
    if (!sale) throw new AppError("Sale not found", 404);

    const currentDue = parseFloat(sale.due_amount);
    if (payAmount > currentDue + 0.01) {
      throw new AppError(
        `Payment ₹${payAmount} exceeds outstanding due ₹${currentDue}`,
        400,
      );
    }
    await SalePayment.create(
      {
        sale_id: id,
        payment_method,
        payment_source_name: data.payment_source_name || null,
        amount: payAmount,
        reference_number: reference_number || null,
        notes: notes || null,
        payment_date: payment_date || new Date(),
      },
      { transaction: t },
    );

    const new_paid = parseFloat(sale.paid_amount) + payAmount;
    const new_due = Math.max(0, parseFloat(sale.total_amount) - new_paid);
    const new_ps = new_due <= 0 ? "paid" : "partial";

    await sale.update({ paid_amount: new_paid, due_amount: new_due, payment_status: new_ps }, { transaction: t });

    // ─── Update Cash Register for cash payments ───────────────────────────
    if ((payment_method || "").toLowerCase() === "cash") {
      const register = await CashRegister.findOne({
        where: { store_id: sale.store_id, status: "open" },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (register) {
        const newBalance = parseFloat(register.expected_balance) + payAmount;
        await register.update({ expected_balance: newBalance }, { transaction: t });
        await CashMovement.create({
          cash_register_id: register.id,
          store_id: sale.store_id,
          user_id,
          movement_type: "cash_in",
          amount: payAmount,
          reference_type: "sale_payment",
          reference_id: id,
          notes: `Payment on Sale #${id}`,
        }, { transaction: t });
      }
    }

    if (sale.customer_id) {
      await Customer.decrement("balance", {
        by: payAmount,
        where: { id: sale.customer_id },
        transaction: t,
      });

      await ledger.writeEntries(
        [
          {
            store_id: sale.store_id,
            party_type:
              payment_method === "bank" ||
              payment_method === "card" ||
              payment_method === "upi"
                ? "bank"
                : "cash",
            transaction_type: "customer_payment",
            reference_type: "customer_payment",
            reference_id: id,
            debit: payAmount,
            credit: 0,
            description: `Payment on Sale #${id} via ${payment_method}`,
            transaction_date: payment_date || new Date(),
            created_by: user_id,
          },
          {
            store_id: sale.store_id,
            party_type: "customer",
            party_id: sale.customer_id,
            transaction_type: "customer_payment",
            reference_type: "customer_payment",
            reference_id: id,
            debit: 0,
            credit: payAmount,
            description: `Payment on Sale #${id} via ${payment_method}`,
            transaction_date: payment_date || new Date(),
            created_by: user_id,
          },
        ],
        t,
      );

      await fLedger.postNamedJE({
        store_id: sale.store_id, reference_type: "sale_payment", reference_id: id,
        date: payment_date || new Date(),
        description: `Payment on Sale #${id}`,
        namedLines: [
          { mappingKey: fLedger.paymentMethodToMappingKey(payment_method), debit: payAmount, credit: 0 },
          { mappingKey: "default_debtor",                     debit: 0, credit: payAmount },
        ],
        user_id,
      }, t);
    } else {
      const mappingKey = fLedger.paymentMethodToMappingKey(payment_method);
      await ledger.writeEntries(
        [
          {
            store_id: sale.store_id,
            party_type: "cash",
            transaction_type: "sale_payment",
            reference_type: "sale_payment",
            reference_id: id,
            debit: payAmount,
            credit: 0,
            description: `Payment on Sale #${id} via ${payment_method}`,
            transaction_date: payment_date || new Date(),
            created_by: user_id,
          },
          {
            store_id: sale.store_id,
            party_type: "sales",
            transaction_type: "sale_payment",
            reference_type: "sale_payment",
            reference_id: id,
            debit: 0,
            credit: payAmount,
            description: `Payment on Sale #${id} via ${payment_method}`,
            transaction_date: payment_date || new Date(),
            created_by: user_id,
          },
        ],
        t,
      );

      await fLedger.postNamedJE({
        store_id: sale.store_id, reference_type: "sale_payment", reference_id: id,
        date: payment_date || new Date(),
        description: `Payment on Sale #${id}`,
        namedLines: [
          { mappingKey, debit: payAmount, credit: 0 },
          { mappingKey: "sales_products", debit: 0, credit: payAmount },
        ],
        user_id,
      }, t);
    }

    return sale;
  });

  await auditLog.log({
    store_id: sale.store_id || store_id,
    user_id,
    module: "sales",
    action: "payment",
    reference_type: "sale",
    reference_id: id,
    new_values: { amount: payAmount, payment_method },
  });

  return getSaleById(id);
};

// ─── Get Sales Stats (for dashboard cards) ───────────────────────────────────
const getSalesStats = async ({ store_id, from, to, status, source } = {}) => {
  const where = (source === 'online') ? {} : (store_id ? { store_id } : {});
  if (status) where.status = status;
  if (source) where.source = source;
  if (from || to) {
    where.sale_date = {};
    if (from) {
      where.sale_date[Op.gte] = from + " 00:00:00";
    }
    if (to) {
      where.sale_date[Op.lte] = to + " 23:59:59";
    }
  }

  const rows = await Sale.findAll({
    where,
    attributes: ["status", "total_amount", "paid_amount", "due_amount"],
    raw: true,
  });

  let total_orders = rows.length;
  let total_revenue = 0;
  let total_collected = 0;
  let total_due = 0;

  rows.forEach((r) => {
    if (r.status !== "cancelled") {
      total_revenue  += parseFloat(r.total_amount  || 0);
      total_collected += parseFloat(r.paid_amount  || 0);
      total_due       += parseFloat(r.due_amount   || 0);
    }
  });

  return {
    total_orders,
    total_revenue:   parseFloat(total_revenue.toFixed(2)),
    total_collected: parseFloat(total_collected.toFixed(2)),
    total_due:       parseFloat(total_due.toFixed(2)),
  };
};

module.exports = {
  generateInvoiceNumber,
  getAllSales,
  getSaleById,
  getByInvoiceNumber,
  createSale,
  updateSaleStatus,
  addPaymentToSale,
  getSalesStats,
};
