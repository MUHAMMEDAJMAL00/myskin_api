"use strict";

const { Op } = require("sequelize");
const {
  ProductInventory,
  ProductBatch,
  StockMovement,
  Product,
  Store,
  Unit,
  Purchase,
  PurchaseItem,
  Vendor,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

const getAllInventory = async (
  store_id,
  page = 1,
  limit = 20,
  search,
  product_id,
) => {
  const productWhere = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } },
          { barcode: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};
  productWhere.is_active = 1;
  if (product_id) productWhere.id = parseInt(product_id);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { count, rows } = await Product.findAndCountAll({
    where: productWhere,
    include: [
      {
        model: ProductInventory,
        attributes: ["id", "store_id", "quantity", "reserved_quantity"],
        where: store_id ? { store_id: { [Op.in]: [store_id, null] } } : undefined,
        required: true,
        include: [{ model: Store, attributes: ["id", "name", "code"] }],
      },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
    ],
    attributes: [
      "id",
      "name",
      "sku",
      "barcode",
      "alert_quantity",
      "max_quantity",
    ],
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  const data = rows.map((product) => {
    const p = product.toJSON();
    const inventory = (p.ProductInventories || [])[0] || {};
    return {
      id: inventory.id || null,
      product_id: p.id,
      store_id: inventory.store_id || (store_id ? parseInt(store_id) : null),
      quantity: inventory.quantity || 0,
      reserved_quantity: inventory.reserved_quantity || 0,
      Product: {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.UnitRef ? p.UnitRef.name : null,
        alert_quantity: p.alert_quantity,
        max_quantity: p.max_quantity,
      },
      Store: inventory.Store || null,
    };
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data,
  };
};

const getProductInventory = async (product_id) => {
  const product = await Product.findByPk(product_id, {
    attributes: ["id", "name", "purchase_price"],
  });
  if (!product) throw new AppError("Product not found", 404);

  const inventories = await ProductInventory.findAll({
    where: { product_id },
    include: [{ model: Store, attributes: ["id", "name", "code"] }],
  });

  const batches = await ProductBatch.findAll({
    where: { product_id },
    include: [{ model: Store, attributes: ["id", "name"] }],
    order: [
      ["expiry_date", "ASC"],
      ["id", "ASC"],
    ],
  });

  const purchaseHistory = await PurchaseItem.findAll({
    where: { product_id },
    include: [
      {
        model: Purchase,
        attributes: ["id", "purchase_number", "purchase_date"],
        include: [
          { model: Vendor, attributes: ["id", "name"] },
          { model: Store, attributes: ["id", "name"] },
        ],
      },
    ],
    order: [[Purchase, "purchase_date", "DESC"]],
    limit: 10,
  });

  return {
    product: product.toJSON(),
    inventories,
    batches,
    purchase_history: purchaseHistory,
  };
};

const getLowStock = async (store_id) => {
  const where = { is_active: 1 };
  if (store_id) where.store_id = store_id;
  const products = await Product.findAll({
    where,
    include: [
      {
        model: ProductInventory,
        attributes: ["id", "store_id", "quantity", "reserved_quantity"],
        where: store_id ? { store_id: { [Op.in]: [store_id, null] } } : undefined,
        required: true,
        include: [{ model: Store, attributes: ["id", "name", "code"] }],
      },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
    ],
    attributes: [
      "id",
      "name",
      "sku",
      "barcode",
      "alert_quantity",
      "max_quantity",
    ],
    order: [["name", "ASC"]],
  });

  return products
    .map((product) => {
      const p = product.toJSON();
      const inventory = (p.ProductInventories || [])[0] || {};
      return {
        id: inventory.id || null,
        product_id: p.id,
        store_id: inventory.store_id || (store_id ? parseInt(store_id) : null),
        quantity: inventory.quantity || 0,
        reserved_quantity: inventory.reserved_quantity || 0,
        Product: {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          unit: p.UnitRef ? p.UnitRef.name : null,
          alert_quantity: p.alert_quantity,
          max_quantity: p.max_quantity,
        },
        Store: inventory.Store || null,
      };
    })
    .filter(
      (item) =>
        parseFloat(item.quantity || 0) <=
        parseFloat(item.Product.alert_quantity || 0),
    );
};

const adjustStock = async (data, user_id) => {
  const {
    product_id,
    store_id,
    quantity_change,
    movement_type,
    notes,
    reference_type,
    reference_id,
    batch_id,
    variant_id,
  } = data;

  const product = await Product.findByPk(product_id, {
    attributes: ["id", "name", "purchase_price"],
  });
  if (!product) throw new AppError("Product not found", 404);

  const store = await Store.findByPk(store_id, { attributes: ["id", "name"] });
  if (!store) throw new AppError("Store not found", 404);

  if (batch_id) {
    const batch = await ProductBatch.findByPk(batch_id, { attributes: ["id", "product_id", "store_id"] });
    if (!batch) throw new AppError("Batch not found", 404);
    if (parseInt(batch.product_id) !== parseInt(product_id)) {
      throw new AppError("Batch does not belong to this product", 400);
    }
    if (parseInt(batch.store_id) !== parseInt(store_id)) {
      throw new AppError("Batch does not belong to this store", 400);
    }
  }

  return sequelize.transaction(async (t) => {
    let inventory = await ProductInventory.findOne({
      where: { product_id, store_id, variant_id: variant_id || null },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!inventory) {
      inventory = await ProductInventory.create(
        { product_id, store_id, variant_id: variant_id || null, quantity: 0, reserved_quantity: 0 },
        { transaction: t },
      );
    }

    const quantity_before = parseFloat(inventory.quantity);
    const parsedChange = parseFloat(quantity_change);
    if (isNaN(parsedChange)) throw new AppError("Invalid quantity change value", 400);
    const quantity_after = quantity_before + parsedChange;

    if (quantity_after < 0) throw new AppError("Insufficient stock", 400);

    await inventory.update({ quantity: quantity_after }, { transaction: t });

    await StockMovement.create(
      {
        product_id,
        variant_id: variant_id || null,
        store_id,
        user_id,
        movement_type,
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        batch_id: batch_id || null,
        quantity_before,
        quantity_change: parsedChange,
        quantity_after,
        notes: notes || null,
      },
      { transaction: t },
    );

    const costValue =
      parseFloat(product.purchase_price || 0) *
      Math.abs(parsedChange);
    if (costValue > 0) {
      const isGain = parsedChange > 0;
      await ledger.writeEntries(
        [
          {
            store_id,
            party_type: isGain ? "inventory" : "expense",
            transaction_type: "stock_adjustment",
            reference_type: reference_type || "stock_adjustment",
            reference_id: reference_id || inventory.id,
            debit: isGain ? costValue : 0,
            credit: isGain ? 0 : costValue,
            description:
              notes ||
              `Stock adjustment: ${parsedChange > 0 ? "+" : ""}${parsedChange}`,
            transaction_date: new Date(),
            created_by: user_id,
          },
          {
            store_id,
            party_type: isGain ? "sales" : "inventory",
            transaction_type: "stock_adjustment",
            reference_type: reference_type || "stock_adjustment",
            reference_id: reference_id || inventory.id,
            debit: isGain ? 0 : costValue,
            credit: isGain ? costValue : 0,
            description: notes || `Stock adjustment offset`,
            transaction_date: new Date(),
            created_by: user_id,
          },
        ],
        t,
      );

      await fLedger.postNamedJE(
        {
          store_id,
          reference_type: reference_type || "stock_adjustment",
          reference_id: reference_id || inventory.id,
          date: new Date(),
          description: notes || `Stock adjustment: ${product.name}`,
          namedLines: isGain
            ? [
                { mappingKey: "stock_in_hand", debit: costValue, credit: 0 },
                { mappingKey: "other_income", debit: 0, credit: costValue },
              ]
            : [
                { mappingKey: "general_expenses", debit: costValue, credit: 0 },
                { mappingKey: "stock_in_hand", debit: 0, credit: costValue },
              ],
          user_id,
        },
        t,
      );
    }

    return inventory.reload({ transaction: t });
  });
};

const transferStock = async (data, user_id) => {
  const { product_id, from_store_id, to_store_id, quantity, variant_id, notes } = data;
  const parsedQuantity = parseFloat(quantity);

  if (from_store_id === to_store_id)
    throw new AppError("Source and destination stores must be different", 400);

  const product = await Product.findByPk(product_id, {
    attributes: ["id", "name", "purchase_price"],
  });
  if (!product) throw new AppError("Product not found", 404);

  const fromStore = await Store.findByPk(from_store_id, {
    attributes: ["id", "name", "code"],
  });
  if (!fromStore) throw new AppError("Source store not found", 404);

  const toStore = await Store.findByPk(to_store_id, {
    attributes: ["id", "name", "code"],
  });
  if (!toStore) throw new AppError("Destination store not found", 404);

  const userNote = (notes || "").trim();
  const fromNote =
    `Transfer to ${toStore.name} (${toStore.code})` +
    (userNote ? ` — ${userNote}` : "");
  const toNote =
    `Transfer from ${fromStore.name} (${fromStore.code})` +
    (userNote ? ` — ${userNote}` : "");

  const vid = variant_id || null;

  return sequelize.transaction(async (t) => {
    const fromInventory = await ProductInventory.findOne({
      where: { product_id, variant_id: vid, store_id: from_store_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!fromInventory || parseFloat(fromInventory.quantity) < parsedQuantity) {
      throw new AppError("Insufficient stock in source store", 400);
    }

    const fromBefore = parseFloat(fromInventory.quantity);
    const fromAfter = fromBefore - parsedQuantity;

    let toInventory = await ProductInventory.findOne({
      where: { product_id, variant_id: vid, store_id: to_store_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!toInventory) {
      toInventory = await ProductInventory.create(
        {
          product_id,
          variant_id: vid,
          store_id: to_store_id,
          quantity: 0,
          reserved_quantity: 0,
        },
        { transaction: t },
      );
    }

    const toBefore = parseFloat(toInventory.quantity);
    const toAfter = toBefore + parsedQuantity;

    await fromInventory.update({ quantity: fromAfter }, { transaction: t });
    await toInventory.update({ quantity: toAfter }, { transaction: t });

    await StockMovement.bulkCreate(
      [
        {
          product_id,
          variant_id: vid,
          store_id: from_store_id,
          user_id,
          movement_type: "transfer",
          reference_type: "transfer",
          reference_id: null,
          quantity_before: fromBefore,
          quantity_change: -parsedQuantity,
          quantity_after: fromAfter,
          notes: fromNote,
        },
        {
          product_id,
          variant_id: vid,
          store_id: to_store_id,
          user_id,
          movement_type: "transfer",
          reference_type: "transfer",
          reference_id: null,
          quantity_before: toBefore,
          quantity_change: parsedQuantity,
          quantity_after: toAfter,
          notes: toNote,
        },
      ],
      { transaction: t },
    );

    const costValue =
      parseFloat(product.purchase_price || 0) *
      parsedQuantity;
    if (costValue > 0) {
      await ledger.writeEntries(
        [
          {
            store_id: from_store_id,
            party_type: "inventory",
            transaction_type: "stock_transfer",
            reference_type: "transfer",
            reference_id: fromInventory.id,
            debit: 0,
            credit: costValue,
            description: fromNote,
            transaction_date: new Date(),
            created_by: user_id,
          },
          {
            store_id: to_store_id,
            party_type: "inventory",
            transaction_type: "stock_transfer",
            reference_type: "transfer",
            reference_id: toInventory.id,
            debit: costValue,
            credit: 0,
            description: toNote,
            transaction_date: new Date(),
            created_by: user_id,
          },
        ],
        t,
      );
    }

    return {
      from: await fromInventory.reload({ transaction: t }),
      to: await toInventory.reload({ transaction: t }),
    };
  });
};

const getMovements = async (
  product_id,
  store_id,
  page = 1,
  limit = 20,
  movement_type,
) => {
  const where = {};
  if (product_id) where.product_id = product_id;
  if (store_id) where.store_id = store_id;
  if (movement_type) where.movement_type = movement_type;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { count, rows } = await StockMovement.findAndCountAll({
    where,
    include: [
      { model: Product, attributes: ["id", "name", "sku"] },
      { model: Store, attributes: ["id", "name", "code"] },
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

const getAllBatches = async ({
  store_id,
  product_id,
  page = 1,
  limit = 500,
} = {}) => {
  const where = {};
  if (store_id) where.store_id = parseInt(store_id, 10);
  if (product_id) where.product_id = parseInt(product_id, 10);

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);
  const offset = (pageInt - 1) * limitInt;

  const { count, rows } = await ProductBatch.findAndCountAll({
    where,
    include: [{ model: Product, attributes: ["id", "name", "sku"] }],
    order: [
      [sequelize.literal("(expiry_date IS NULL)"), "ASC"],
      ["expiry_date", "ASC"],
      ["id", "ASC"],
    ],
    limit: limitInt,
    offset,
    distinct: true,
  });

  return {
    total: count,
    page: pageInt,
    limit: limitInt,
    total_pages: Math.ceil(count / limitInt) || 0,
    data: rows,
  };
};

module.exports = {
  getAllInventory,
  getProductInventory,
  getLowStock,
  adjustStock,
  transferStock,
  getMovements,
  getAllBatches,
};
