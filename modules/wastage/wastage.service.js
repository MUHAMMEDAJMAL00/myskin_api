"use strict";

const { Op } = require("sequelize");
const {
  Wastage,
  Product,
  Store,
  User,
  ProductInventory,
  ProductBatch,
  StockMovement,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger   = require("../accountLedger/accountLedger.service");
const fLedger  = require("../shared/financialLedger.service");
const auditLog = require("../auditLog/auditLog.service");

const createWastage = async (data, user_id) => {
  const { product_id, store_id, quantity, reason, notes, reference_number, variant_id } = data;
  const vid = variant_id || null;

  const product = await Product.findByPk(product_id);
  if (!product) throw new AppError("Product not found", 404);

  return sequelize.transaction(async (t) => {
    // 1. Get current inventory
    let inventory = await ProductInventory.findOne({
      where: { product_id, variant_id: vid, store_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!inventory || parseFloat(inventory.quantity) < parseFloat(quantity)) {
      throw new AppError("Insufficient stock to record wastage", 400);
    }

    const qtyBefore = parseFloat(inventory.quantity);
    const qtyChange = -parseFloat(quantity);
    const qtyAfter = qtyBefore + qtyChange;

    // 2. Update inventory
    await inventory.update({ quantity: qtyAfter }, { transaction: t });

    // 3. FIFO Batch Deduction — mirrors sales.service.js logic
    let remaining = parseFloat(quantity);
    const batches = await ProductBatch.findAll({
      where: {
        product_id,
        variant_id: vid,
        store_id,
        is_active: 1,
        current_quantity: { [Op.gt]: 0 },
      },
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

    // 5. Create Wastage record
    const wastage = await Wastage.create(
      {
        product_id,
        variant_id: vid,
        store_id,
        user_id,
        quantity,
        reason,
        notes,
        reference_number,
      },
      { transaction: t },
    );

    // 6. Log Stock Movement
    await StockMovement.create(
      {
        product_id,
        variant_id: vid,
        store_id,
        user_id,
        movement_type: "dead_stock",
        reference_type: "wastage",
        reference_id: wastage.id,
        quantity_before: qtyBefore,
        quantity_change: qtyChange,
        quantity_after: qtyAfter,
        notes: `Wastage: ${reason}. ${notes || ""}`,
      },
      { transaction: t },
    );

    // 7. Accounting entries — inventory write-off
    let unitCost = parseFloat(product.purchase_price || 0);
    if (unitCost <= 0) {
      const batch = await ProductBatch.findOne({
        where: { product_id, variant_id: vid, store_id, is_active: 1, current_quantity: { [Op.gt]: 0 } },
        order: [["created_at", "DESC"]],
        transaction: t,
      });
      if (batch) unitCost = parseFloat(batch.purchase_rate || 0);
    }
    const costValue = unitCost * parseFloat(quantity);
    if (costValue > 0) {
      await ledger.writeEntries([
        {
          store_id, party_type: "expense",
          transaction_type: "wastage", reference_type: "wastage",
          reference_id: wastage.id, debit: costValue, credit: 0,
          description: `Wastage: ${reason} — ${product.name}`,
          transaction_date: new Date(), created_by: user_id,
        },
        {
          store_id, party_type: "inventory",
          transaction_type: "wastage", reference_type: "wastage",
          reference_id: wastage.id, debit: 0, credit: costValue,
          description: `Inventory written off: ${product.name}`,
          transaction_date: new Date(), created_by: user_id,
        },
      ], t);

      await fLedger.postNamedJE({
        store_id,
        reference_type: "wastage",
        reference_id:   wastage.id,
        date:           new Date(),
        description:    `Wastage: ${product.name} (qty ${quantity})`,
        namedLines: [
          { mappingKey: "general_expenses", debit: costValue, credit: 0 },
          { mappingKey: "stock_in_hand",    debit: 0, credit: costValue },
        ],
        user_id,
      }, t);
    }

    await auditLog.log({
      store_id,
      user_id,
      module:         "wastages",
      action:         "create",
      reference_type: "wastage",
      reference_id:   wastage.id,
      new_values: {
        product_id,
        quantity,
        reason,
        reference_number,
      },
    });

    return wastage;
  });
};

const getWastages = async (params) => {
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
    ];
  }

  const include = [
    { model: Product, attributes: ["id", "name", "sku"], required: false },
    { model: User, attributes: ["id", "name"], required: false },
  ];

  try {
    const { count, rows } = await Wastage.findAndCountAll({
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

const reverseWastage = async (id, user_id, store_id = null) => {
  const where = { id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const wastage = await Wastage.findOne({ where, include: [{ model: Product }] });
  if (!wastage) throw new AppError("Wastage record not found", 404);

  // Prevent double-reversal by checking if a reversal movement already exists
  const alreadyReversed = await StockMovement.findOne({
    where: { movement_type: "wastage_reversal", reference_type: "wastage", reference_id: id },
  });
  if (alreadyReversed) throw new AppError("This wastage has already been reversed", 409);

  const product = wastage.Product || await Product.findByPk(wastage.product_id);
  if (!product) throw new AppError("Product not found", 404);

  return sequelize.transaction(async (t) => {
    // Restore inventory
    let inventory = await ProductInventory.findOne({
      where: { product_id: wastage.product_id, store_id: wastage.store_id, variant_id: wastage.variant_id || null },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!inventory) {
      inventory = await ProductInventory.create(
        { product_id: wastage.product_id, store_id: wastage.store_id, variant_id: wastage.variant_id || null, quantity: 0, reserved_quantity: 0 },
        { transaction: t },
      );
    }

    const qtyBefore = parseFloat(inventory.quantity);
    const qtyRestore = parseFloat(wastage.quantity);
    const qtyAfter = qtyBefore + qtyRestore;
    await inventory.update({ quantity: qtyAfter }, { transaction: t });

    // Restore batches — add qty back to existing batches
    let rem = qtyRestore;
    const restoreBatches = await ProductBatch.findAll({
      where: { product_id: wastage.product_id, variant_id: wastage.variant_id || null, store_id: wastage.store_id, is_active: 1 },
      order: [["expiry_date", "DESC"], ["id", "DESC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    for (const b of restoreBatches) {
      if (rem <= 0) break;
      await b.update({ current_quantity: parseFloat(b.current_quantity) + rem }, { transaction: t });
      rem = 0;
    }

    // Log reversal movement
    await StockMovement.create({
      product_id: wastage.product_id, variant_id: wastage.variant_id || null, store_id: wastage.store_id, user_id,
      movement_type: "wastage_reversal", reference_type: "wastage", reference_id: id,
      quantity_before: qtyBefore, quantity_change: qtyRestore, quantity_after: qtyAfter,
      notes: `Wastage reversal for record #${id}`,
    }, { transaction: t });

    // Reverse accounting entries
    let unitCost = parseFloat(product.cost_price || 0);
    if (unitCost <= 0) {
      const batch = await ProductBatch.findOne({
        where: { product_id: wastage.product_id, variant_id: wastage.variant_id || null, store_id: wastage.store_id, is_active: 1, current_quantity: { [Op.gt]: 0 } },
        order: [["created_at", "DESC"]],
        transaction: t,
      });
      if (batch) unitCost = parseFloat(batch.purchase_rate || 0);
    }
    const costValue = unitCost * qtyRestore;
    if (costValue > 0) {
      await ledger.writeEntries([
        {
          store_id: wastage.store_id, party_type: "inventory",
          transaction_type: "wastage_reversal", reference_type: "wastage_reversal",
          reference_id: id, debit: costValue, credit: 0,
          description: `Wastage reversal: ${product.name}`,
          transaction_date: new Date(), created_by: user_id,
        },
        {
          store_id: wastage.store_id, party_type: "expense",
          transaction_type: "wastage_reversal", reference_type: "wastage_reversal",
          reference_id: id, debit: 0, credit: costValue,
          description: `Wastage reversal: ${product.name}`,
          transaction_date: new Date(), created_by: user_id,
        },
      ], t);

      await fLedger.postNamedJE({
        store_id: wastage.store_id,
        reference_type: "wastage_reversal",
        reference_id: id,
        date: new Date(),
        description: `Wastage reversed: ${product.name} (qty ${qtyRestore})`,
        namedLines: [
          { mappingKey: "stock_in_hand",    debit: costValue, credit: 0 },
          { mappingKey: "general_expenses", debit: 0, credit: costValue },
        ],
        user_id,
      }, t);
    }

    await auditLog.log({
      store_id: wastage.store_id,
      user_id,
      module:         "wastages",
      action:         "reverse",
      reference_type: "wastage",
      reference_id:   id,
      new_values: {
        product_id: wastage.product_id,
        quantity:   qtyRestore,
        reason:     wastage.reason,
      },
    });

    return { message: "Wastage reversed successfully", wastage_id: id };
  });
};

module.exports = {
  createWastage,
  getWastages,
  reverseWastage,
};
