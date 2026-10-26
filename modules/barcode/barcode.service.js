"use strict";
const { Op } = require("sequelize");
const {
  Product, ProductBarcode, ProductInventory, Category, Unit,
  PurchaseItem, Purchase, Vendor,
} = require("../../database/index");
const AppError = require("../../utils/AppError");

// ─── Common product format ────────────────────────────────────────────────────
const formatProduct = (product, inventory, lastVendor) => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  barcode: product.barcode,
  unit: product.UnitRef ? product.UnitRef.name : null,
  selling_price: parseFloat(product.selling_price),
  purchase_price: parseFloat(product.purchase_price),
  tax_rate: parseFloat(product.tax_rate),
  is_service: product.is_service,
  category: product.Category
    ? { id: product.Category.id, name: product.Category.name }
    : null,
  stock: inventory
    ? {
        quantity: parseFloat(inventory.quantity),
        reserved_quantity: parseFloat(inventory.reserved_quantity),
        available: parseFloat(inventory.quantity) - parseFloat(inventory.reserved_quantity),
      }
    : null,
  last_vendor: lastVendor || null, // { id, name, company, phone }
});

// ─── Get last vendor who supplied a product ───────────────────────────────────
const getLastVendor = async (product_id, store_id) => {
  const lastPurchaseItem = await PurchaseItem.findOne({
    where: { product_id },
    include: [
      {
        model: Purchase,
        where: store_id ? { store_id } : {},
        include: [{ model: Vendor, attributes: ["id", "name", "company", "phone"] }],
        required: true,
      },
    ],
    order: [[Purchase, "purchase_date", "DESC"]],
  });

  if (!lastPurchaseItem || !lastPurchaseItem.Purchase || !lastPurchaseItem.Purchase.Vendor) {
    return null;
  }

  const v = lastPurchaseItem.Purchase.Vendor;
  return { id: v.id, name: v.name, company: v.company, phone: v.phone };
};

// ─── Scan by barcode ──────────────────────────────────────────────────────────
exports.scan = async (barcode, store_id) => {
  const storeFilter = store_id ? { store_id } : {};

  // Primary lookup: products.barcode column (exact match, scoped to store)
  let product = await Product.findOne({
    where: { barcode, is_active: 1, ...storeFilter },
    include: [
      { model: Category, attributes: ["id", "name"] },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
    ],
  });

  // Fallback 1: product_barcodes table (multiple/alternate barcodes, scoped to store)
  if (!product) {
    const pb = await ProductBarcode.findOne({
      where: { barcode, is_active: 1 },
      include: [
        {
          model: Product,
          as: "Product",
          where: { is_active: 1, ...storeFilter },
          include: [
            { model: Category, attributes: ["id", "name"] },
            { model: Unit, as: "UnitRef", attributes: ["name"] },
          ],
        },
      ],
    });
    if (pb) product = pb.Product;
  }

  // Fallback 2: search by SKU (scoped to store)
  if (!product) {
    product = await Product.findOne({
      where: { sku: barcode, is_active: 1, ...storeFilter },
      include: [
        { model: Category, attributes: ["id", "name"] },
        { model: Unit, as: "UnitRef", attributes: ["name"] },
      ],
    });
  }

  if (!product)
    throw new AppError(`No product found with barcode: ${barcode}`, 404);

  const [inventory, lastVendor] = await Promise.all([
    ProductInventory.findOne({ where: { product_id: product.id, store_id } }),
    getLastVendor(product.id, store_id),
  ]);

  return formatProduct(product, inventory, lastVendor);
};


// ─── Find by SKU ──────────────────────────────────────────────────────────────
exports.findBySku = async (sku, store_id) => {
  const storeFilter = store_id ? { store_id } : {};
  const product = await Product.findOne({
    where: { sku, is_active: 1, ...storeFilter },
    include: [
      { model: Category, attributes: ["id", "name"] },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
    ],
  });

  if (!product) throw new AppError(`No product found with SKU: ${sku}`, 404);

  const [inventory, lastVendor] = await Promise.all([
    ProductInventory.findOne({ where: { product_id: product.id, store_id } }),
    getLastVendor(product.id, store_id),
  ]);

  return formatProduct(product, inventory, lastVendor);
};

// ─── Search by name / sku / barcode ──────────────────────────────────────────
exports.search = async (q, store_id) => {
  if (!q || q.trim().length < 1)
    throw new AppError("Search query required", 400);

  const storeFilter = store_id ? { store_id } : {};

  const products = await Product.findAll({
    where: {
      is_active: 1,
      ...storeFilter,
      [Op.or]: [
        { name: { [Op.like]: `%${q}%` } },
        { sku: { [Op.like]: `%${q}%` } },
        { barcode: { [Op.like]: `%${q}%` } },
        { "$ProductBarcodes.barcode$": { [Op.like]: `%${q}%` } },
      ],
    },
    include: [
      { model: Category, attributes: ["id", "name"] },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
      { model: ProductBarcode, as: "ProductBarcodes", required: false, attributes: ["id", "barcode", "type"] },
    ],
    limit: 20,
    subQuery: false,
    distinct: true,
  });

  const ids = products.map((p) => p.id);
  const inventories = await ProductInventory.findAll({
    where: { product_id: { [Op.in]: ids }, store_id },
    raw: true,
  });
  const invMap = {};
  inventories.forEach((inv) => { invMap[inv.product_id] = inv; });

  const results = products.map((product) => {
    const inventory = invMap[product.id] || null;
    return formatProduct(product, inventory);
  });

  return results;
};
