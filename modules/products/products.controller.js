"use strict";

const { Op } = require("sequelize");
const productService = require("./products.service");
const auditLog = require("../auditLog/auditLog.service");

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active, category_id } = req.query;
    const result = await productService.getAllProducts({
      page,
      limit,
      search,
      is_active,
      category_id,
      storeId: req.storeId,
      filterByStore: !!req.storeId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id, req.storeId);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};
const create = async (req, res, next) => {
  try {
    const product = await productService.createProduct({ ...req.body, store_id: req.storeId });
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "products", action: "create", reference_type: "product", reference_id: product.id, new_values: { name: product.name, sku: product.sku, store_id: product.store_id }, ip_address: req.ip });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.user?.id ?? req.user?.user_id);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "products", action: "update", reference_type: "product", reference_id: parseInt(req.params.id), new_values: req.body, ip_address: req.ip });
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.id);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "products", action: "delete", reference_type: "product", reference_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const generateBarcode = async (req, res, next) => {
  try {
    const barcode = await productService.generateBarcode();
    res.json({ success: true, barcode });
  } catch (err) {
    next(err);
  }
};

const uploadImage = (req, res, next) => {
  const { uploadProductImage } = require("../../middleware/upload");
  uploadProductImage(req, res, (err) => {
    if (err) return next(err);
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded" });
    const url = "/uploads/products/" + req.file.filename;
    res.json({ success: true, data: { url } });
  });
};

const uploadVariantImage = (req, res, next) => {
  const { uploadProductImage } = require("../../middleware/upload");
  uploadProductImage(req, res, (err) => {
    if (err) return next(err);
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded" });
    const url = "/uploads/products/" + req.file.filename;
    res.json({ success: true, data: { url } });
  });
};

const setOfferAssignments = async (req, res, next) => {
  try {
    const product_id = req.params.id;
    const offer_ids = Array.isArray(req.body.offer_ids)
      ? req.body.offer_ids
      : [];
    const product = await productService.setProductOfferAssignments(
      product_id,
      offer_ids,
      req.storeId,
    );
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const getVariants = async (req, res, next) => {
  try {
    const variants = await productService.getProductVariants(req.params.id, req.storeId);
    res.json({ success: true, data: variants });
  } catch (err) {
    next(err);
  }
};

const createVariant = async (req, res, next) => {
  try {
    const variant = await productService.createProductVariant(
      req.params.id,
      req.body,
      req.storeId,
    );
    res.status(201).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

const updateVariant = async (req, res, next) => {
  try {
    const variant = await productService.updateProductVariant(
      req.params.id,
      req.params.vid,
      req.body,
      req.storeId,
    );
    res.json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

const removeVariant = async (req, res, next) => {
  try {
    const result = await productService.deleteProductVariant(
      req.params.id,
      req.params.vid,
      req.storeId,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ─── Barcode lookup (POS scan endpoint) ──────────────────────────────────────
const lookupBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.query;
    if (!barcode)
      return res
        .status(400)
        .json({ success: false, message: "barcode is required" });
    const store_id = req.storeId || null;
    if (!store_id)
      return res
        .status(404)
        .json({ success: false, message: "No product found for this barcode" });
    const result = await productService.lookupByBarcode(barcode, store_id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// GET /products/barcode-stock?barcode=X&store_id=Y
const barcodeStock = async (req, res, next) => {
  try {
    const { barcode } = req.query;
    if (!barcode)
      return res
        .status(400)
        .json({ success: false, message: "barcode is required" });
    const result = await productService.getBarcodeStock(barcode, req.storeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Per-product barcode CRUD ─────────────────────────────────────────────────
const getBarcodes = async (req, res, next) => {
  try {
    const barcodes = await productService.getProductBarcodes(req.params.id, req.storeId);
    res.json({ success: true, data: barcodes });
  } catch (err) {
    next(err);
  }
};

const addBarcode = async (req, res, next) => {
  try {
    const bcRow = await productService.addProductBarcode(
      req.params.id,
      req.body,
      req.user.id,
      req.storeId || req.body.store_id,
    );
    res.status(201).json({ success: true, data: bcRow });
  } catch (err) {
    next(err);
  }
};

const updateBarcode = async (req, res, next) => {
  try {
    const bcRow = await productService.updateProductBarcode(
      req.params.id,
      req.params.bid,
      req.body,
      req.user.id,
      req.storeId || req.body.store_id,
    );
    res.json({ success: true, data: bcRow });
  } catch (err) {
    next(err);
  }
};

const removeBarcode = async (req, res, next) => {
  try {
    const { reason } = req.query;
    const result = await productService.deactivateProductBarcode(
      req.params.id,
      req.params.bid,
      reason || req.body.reason,
      req.user.id,
      req.storeId || req.body.store_id,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getBarcodeLogs = async (req, res, next) => {
  try {
    const logs = await productService.getBarcodeChangeLogs(req.params.id);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

// ─── All barcodes for a product (print selection UI) ─────────────────────────
const getAllBarcodesForPrint = async (req, res, next) => {
  try {
    const data = await productService.getAllBarcodesForPrint(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── Barcode Print Data ───────────────────────────────────────────────────────
const getBarcodePrintData = async (req, res, next) => {
  try {
    const data = await productService.getBarcodePrintData(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getBulkBarcodePrintData = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: "items array is required" });
    }
    const data = await productService.getBulkBarcodePrintData(items, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── Store-Specific Pricing ───────────────────────────────────────────────────
const getStorePrice = async (req, res, next) => {
  try {
    const data = await productService.getStoreProductPrice(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const setStorePrice = async (req, res, next) => {
  try {
    const { price } = req.body;
    if (price === undefined)
      return res.status(400).json({ success: false, message: "price is required" });
    const data = await productService.setStoreProductPrice(req.params.id, req.storeId, price);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const removeStorePrice = async (req, res, next) => {
  try {
    const data = await productService.deleteStoreProductPrice(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── Excel Import ─────────────────────────────────────────────────────────────

const bulkPriceUpdate = async (req, res, next) => {
  try {
    const result = await productService.bulkPriceUpdate(req.storeId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const importProductTemplate = (_req, res) => {
  const XLSX = require("xlsx");
  const headers = [
    ["name","sku","barcode","selling_price","purchase_price","mrp","tax_rate","unit","unit_value","category","category_image_url","subcategory","subcategory_image_url","description","brand","hsn_code","discount_name","discount_percent","image_url","is_active"],
    ["Sample Product","SKU001","","99.00","60.00","110.00","18","Kilogram","1","Apparel","/uploads/categories/apparel.jpg","T-Shirts","/uploads/categories/tshirts.jpg","Sample description","BrandA","0401","Summer Sale","10","/uploads/products/sample.jpg","1"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  ws["!cols"] = headers[0].map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="products_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
};

const importProducts = (req, res, next) => {
  const { uploadProductXlsx } = require("../../middleware/upload");
  uploadProductXlsx(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    try {
      const XLSX = require("xlsx");
      const { Category, Unit, TaxGroup, Discount, Store } = require("../../database/index");

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) return res.json({ success: true, created: 0, errors: [] });

      // Ensure store_id is valid for creating discounts (which require non-null store_id)
      let importStoreId = req.storeId;
      if (!importStoreId) {
        const defaultStore = await Store.findOne({ where: { is_active: 1 }, order: [["id", "ASC"]] });
        importStoreId = defaultStore ? defaultStore.id : null;
      }

      // Pre-load existing data for name-based lookup
      const [allCats, allUnits, allTaxGroups, allDiscounts] = await Promise.all([
        Category.findAll({ where: { store_id: importStoreId }, attributes: ["id","name","parent_id"] }),
        Unit.findAll({ where: { [Op.or]: [{ store_id: importStoreId }, { store_id: null }] }, attributes: ["id","name"] }),
        TaxGroup.findAll({ where: { [Op.or]: [{ store_id: importStoreId }, { store_id: null }] }, attributes: ["id","rate","name","tax_type"] }),
        Discount.findAll({ where: { store_id: importStoreId }, attributes: ["id","name","discount_value","discount_value_type"] }),
      ]);
      const taxGroupMap = {};
      allTaxGroups.forEach((g) => { taxGroupMap[parseFloat(g.rate)] = g; });
      const discountMap = {};
      allDiscounts.forEach((d) => { discountMap[d.name.trim().toLowerCase()] = d; });

      const catMap = {};
      allCats.forEach((c) => { catMap[(c.name.trim().toLowerCase() + "|" + (c.parent_id || "0"))] = c.id; });
      const unitMap = {};
      allUnits.forEach((u) => { unitMap[u.name.trim().toLowerCase()] = u.id; });

      const importCatCache = {};

      async function resolveCategory(name, parentId, imageUrl) {
        if (!name) return null;
        const key = name.trim().toLowerCase() + "|" + (parentId || "0");
        const cached = importCatCache[key] || catMap[key];
        if (cached) return cached;
        const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
        let slug = baseSlug;
        let counter = 0;
        while (await Category.findOne({ where: { store_id: importStoreId, slug } })) {
          counter++;
          slug = baseSlug + "-" + counter;
        }
        const cat = await Category.create({
          store_id: importStoreId, name: name.trim(),
          slug, parent_id: parentId, is_active: 1,
          image_url: imageUrl || null,
        });
        importCatCache[key] = cat.id;
        catMap[key] = cat.id;
        return cat.id;
      }

      async function resolveUnit(name) {
        if (!name) return null;
        const key = name.trim().toLowerCase();
        if (unitMap[key]) return unitMap[key];
        const unit = await Unit.create({ name: name.trim(), store_id: importStoreId });
        unitMap[key] = unit.id;
        return unit.id;
      }

      async function resolveTaxGroup(rate) {
        const numRate = parseFloat(rate);
        if (!numRate || isNaN(numRate)) return null;
        const existing = taxGroupMap[numRate];
        if (existing) return existing.id;
        const name = `GST ${numRate}%`;
        const group = await TaxGroup.create({
          name, rate: numRate, category: "GST",
          tax_type: "exclusive", is_active: 1,
          store_id: importStoreId,
        });
        taxGroupMap[numRate] = group;
        return group.id;
      }

      async function resolveDiscount(name, percent) {
        const dName = String(name || "").trim();
        const dPercent = parseFloat(percent) || 0;
        if (!dName || !dPercent) return null;
        const key = dName.toLowerCase();
        if (discountMap[key]) return discountMap[key].id;
        const discount = await Discount.create({
          store_id: importStoreId, name: dName,
          discount_type: "percent",
          discount_value: dPercent,
          discount_value_type: "percent",
          apply_to: "product",
          is_active: 1,
        });
        discountMap[key] = discount;
        return discount.id;
      }

      const results = { created: 0, skipped: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 2;

        const name = String(r.name || "").trim();
        const sku = String(r.sku || "").trim();
        const sellingPrice = parseFloat(r.selling_price);

        if (!name) { results.errors.push(`Row ${rowNum}: name is required`); results.skipped++; continue; }
        if (!sku)  { results.errors.push(`Row ${rowNum}: sku is required`); results.skipped++; continue; }
        if (isNaN(sellingPrice)) { results.errors.push(`Row ${rowNum}: selling_price must be a number`); results.skipped++; continue; }

        const unit_id = await resolveUnit(String(r.unit || "").trim());
        const tax_group_id = await resolveTaxGroup(r.tax_rate);
        const discount_id = await resolveDiscount(r.discount_name, r.discount_percent);

        const parentCatName = String(r.category || "").trim();
        const parentCatImage = String(r.category_image_url || "").trim() || null;
        const subcatName = String(r.subcategory || "").trim();
        const subcatImage = String(r.subcategory_image_url || "").trim() || null;

        let category_id = null;
        if (subcatName && parentCatName) {
          const parentId = await resolveCategory(parentCatName, null, parentCatImage);
          category_id = await resolveCategory(subcatName, parentId, subcatImage);
        } else if (parentCatName) {
          category_id = await resolveCategory(parentCatName, null, parentCatImage);
        }

        const taxRate = parseFloat(r.tax_rate) || 0;
        const productData = {
          store_id: importStoreId,
          name,
          sku,
          barcode: String(r.barcode || "").trim() || null,
          selling_price: sellingPrice,
          purchase_price: parseFloat(r.purchase_price) || 0,
          mrp: r.mrp !== "" && r.mrp != null ? parseFloat(r.mrp) : null,
          tax_rate: taxRate,
          tax_group_id,
          unit_id: unit_id || null,
          unit_value: String(r.unit_value || "").trim() || null,
          description: String(r.description || "").trim() || null,
          brand: String(r.brand || "").trim() || null,
          hsn_code: String(r.hsn_code || "").trim() || null,
          discount_id: discount_id || null,
          image_url: String(r.image_url || "").trim() || null,
          category_id: category_id || null,
          is_active: r.is_active !== "" ? parseInt(r.is_active) : 1,
        };

        try {
          await productService.createProduct(productData);
          results.created++;
        } catch (e) {
          results.errors.push(`Row ${rowNum} (${name}): ${e.message}`);
          results.skipped++;
        }
      }

      res.json({ success: true, ...results });
    } catch (e) {
      next(e);
    }
  });
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  generateBarcode,
  uploadImage,
  uploadVariantImage,
  setOfferAssignments,
  getVariants,
  createVariant,
  updateVariant,
  removeVariant,
  // Barcode
  lookupBarcode,
  barcodeStock,
  getBarcodes,
  addBarcode,
  updateBarcode,
  removeBarcode,
  getBarcodeLogs,
  // Barcode print
  getAllBarcodesForPrint,
  getBarcodePrintData,
  getBulkBarcodePrintData,
  // Store pricing
  getStorePrice,
  setStorePrice,
  removeStorePrice,
  // Import
  importProductTemplate,
  importProducts,
  bulkPriceUpdate,
};
