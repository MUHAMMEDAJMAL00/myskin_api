"use strict";

const { Op } = require("sequelize");
const {
  Product,
  Category,
  Store,
  Unit,
  ProductInventory,
  ProductBarcode,
  BarcodeChangeLog,
  TaxGroup,
  Discount,
  OfferProduct,
  ProductVariant,
  StoreProductPrice,
} = require("../../database/index");
const AppError = require("../../utils/AppError");

const BARCODE_PREFIX = "20";

// ─── Active discount filter (excludes expired) ───────────────────────────────
const _ACTIVE_DISCOUNT_WHERE = {
  is_active: 1,
  [Op.and]: [
    { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: new Date() } }] },
    { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }] },
  ],
};

const _ean13CheckDigit = (first12Digits) => {
  const sum = first12Digits.split("").reduce((total, digit, index) => {
    const value = parseInt(digit, 10);
    return total + value * (index % 2 === 0 ? 1 : 3);
  }, 0);
  return String((10 - (sum % 10)) % 10);
};

const _hasBarcodeConflict = async (barcode, exclude = {}) => {
  const [product, productBarcode, variant] = await Promise.all([
    Product.findOne({
      where: {
        barcode,
        ...(exclude.product_id ? { id: { [Op.ne]: exclude.product_id } } : {}),
      },
      attributes: ["id"],
    }),
    ProductBarcode.findOne({
      where: {
        barcode,
        ...(exclude.product_barcode_id
          ? { id: { [Op.ne]: exclude.product_barcode_id } }
          : {}),
      },
      attributes: ["id"],
    }),
    ProductVariant.findOne({
      where: {
        barcode,
        ...(exclude.variant_id ? { id: { [Op.ne]: exclude.variant_id } } : {}),
      },
      attributes: ["id"],
    }),
  ]);

  return Boolean(product || productBarcode || variant);
};
//barcode generatingg
const generateBarcode = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const body =
      String(Date.now()).slice(-8) +
      String(Math.floor(Math.random() * 100)).padStart(2, "0");
    const first12 = `${BARCODE_PREFIX}${body}`.slice(0, 12);
    const barcode = first12 + _ean13CheckDigit(first12);
    if (!(await _hasBarcodeConflict(barcode))) return barcode;
  }

  throw new AppError(
    "Unable to generate a unique barcode. Please try again.",
    500,
  );
};

const _hasBarcode = (barcode) => !!(barcode && String(barcode).trim());

// ─── Shared barcode attributes for eager-loads ───────────────────────────────
const _BARCODE_INCLUDE = {
  model: ProductBarcode,
  as: "ProductBarcodes",
  attributes: [
    "id",
    "barcode",
    "type",
    "offer_id",
    "is_active",
    "valid_from",
    "valid_to",
    "notes",
  ],
  required: false,
  include: [
    {
      model: Discount,
      as: "Offer",
      attributes: ["id", "name", "code", "discount_type", "is_active"],
      required: false,
      where: _ACTIVE_DISCOUNT_WHERE,
    },
  ],
};

// ─── Shared offer attributes for eager-loads ─────────────────────────────────
const _OFFER_ATTRS = [
  "id",
  "name",
  "code",
  "discount_type",
  "discount_value",
  "discount_value_type",
  "min_order_amount",
  "max_discount_amount",
  "bogo_buy_qty",
  "bogo_get_qty",
  "min_qty",
  "is_active",
  "single_use_per_bill",
  "max_per_transaction",
];

const getAllProducts = async ({
  page = 1,
  limit = 20,
  search,
  is_active,
  category_id,
  storeId,
  filterByStore = false,
} = {}) => {
  const where = {};
  // Only filter by store when explicitly requested (myskin_admin store-scoped views).
  // POS terminals show the full active product catalog regardless of store context.
  if (filterByStore && storeId) where.store_id = parseInt(storeId, 10);
  if (is_active !== undefined && is_active !== "") {
    where.is_active = parseInt(is_active);
  } else {
    where.is_active = 1;
  }
  if (category_id) where.category_id = parseInt(category_id);
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
      { barcode: { [Op.like]: `%${search}%` } },
      { "$ProductBarcodes.barcode$": { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Product.findAndCountAll({
    where,
    distinct: true,
    subQuery: false,
    include: [
      { model: Category, attributes: ["id", "name", "slug"] },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
      {
        model: ProductInventory,
        attributes: ["quantity", "store_id", "variant_id"],
        required: false,
      },
      {
        model: TaxGroup,
        as: "TaxGroup",
        attributes: ["id", "name", "tax_type", "rate", "components"],
        required: false,
      },
      {
        model: Discount,
        as: "Discount",
        attributes: _OFFER_ATTRS,
        required: false,
        where: _ACTIVE_DISCOUNT_WHERE,
      },
      {
        model: OfferProduct,
        as: "OfferProducts",
        attributes: ["id", "offer_id", "product_id", "variant_id", "sequence"],
        required: false,
        include: [
          {
            model: Discount,
            as: "offer",
            attributes: _OFFER_ATTRS,
            required: false,
            where: _ACTIVE_DISCOUNT_WHERE,
          },
        ],
      },
      {
        model: ProductVariant,
        as: "Variants",
        required: false,
        attributes: ["id", "variant_name", "sku", "selling_price", "mrp", "purchase_price", "quantity", "unit", "image_url", "is_active"],
        include: [
          {
            model: Discount,
            as: "Discount",
            attributes: _OFFER_ATTRS,
            required: false,
            where: _ACTIVE_DISCOUNT_WHERE,
          },
        ],
      },
      _BARCODE_INCLUDE,
    ],
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / limit),
    data: rows,
  };
};

const getProductById = async (id, storeId) => {
  const product = await Product.findByPk(id, {
    include: [
      { model: Category, attributes: ["id", "name", "slug"] },
      { model: Unit, as: "UnitRef", attributes: ["name"] },
      {
        model: ProductInventory,
        attributes: ["quantity", "store_id", "variant_id"],
        required: false,
      },
      {
        model: TaxGroup,
        as: "TaxGroup",
        attributes: ["id", "name", "tax_type", "rate", "components"],
        required: false,
      },
      {
        model: Discount,
        as: "Discount",
        attributes: _OFFER_ATTRS,
        required: false,
        where: _ACTIVE_DISCOUNT_WHERE,
      },
      {
        model: OfferProduct,
        as: "OfferProducts",
        attributes: ["id", "offer_id", "product_id", "variant_id", "sequence"],
        required: false,
        include: [
          {
            model: Discount,
            as: "offer",
            attributes: _OFFER_ATTRS,
            required: false,
            where: _ACTIVE_DISCOUNT_WHERE,
          },
        ],
      },
      {
        model: ProductVariant,
        as: "Variants",
        required: false,
        attributes: ["id", "variant_name", "sku", "selling_price", "mrp", "purchase_price", "quantity", "unit", "image_url", "is_active"],
        include: [
          {
            model: Discount,
            as: "Discount",
            attributes: _OFFER_ATTRS,
            required: false,
            where: _ACTIVE_DISCOUNT_WHERE,
          },
        ],
      },
      _BARCODE_INCLUDE,
    ],
  });
  if (!product || (storeId && product.store_id !== parseInt(storeId, 10)))
    throw new AppError("Product not found", 404);
  return product;
};

const _applyTaxGroup = async (data) => {
  if (data.tax_group_id) {
    const group = await TaxGroup.findByPk(data.tax_group_id, {
      attributes: ["id", "rate", "tax_type"],
    });
    if (!group) throw new AppError("Tax group not found", 404);
    data.tax_rate = group.rate;
    data.tax_included = group.tax_type === "inclusive" ? 1 : 0;
  } else if ("tax_group_id" in data && data.tax_group_id === null) {
    data.tax_rate = data.tax_rate !== undefined ? data.tax_rate : 0;
    data.tax_included = 0;
  }
};

const _ensureVariantBarcodeIsUnique = async (
  barcode,
  excludeVariantId = null,
) => {
  if (!barcode) return;
  const normalized = barcode.toString().trim();
  if (!normalized) return;

  const existingVariant = await ProductVariant.findOne({
    where: {
      barcode: normalized,
      ...(excludeVariantId ? { id: { [Op.ne]: excludeVariantId } } : {}),
    },
    attributes: ["id"],
  });
  if (existingVariant)
    throw new AppError("Variant barcode already exists", 409);

  const existingProductBarcode = await ProductBarcode.findOne({
    where: { barcode: normalized },
    attributes: ["id"],
  });
  if (existingProductBarcode)
    throw new AppError("Barcode already registered to another product", 409);

  const existingPrimary = await Product.findOne({
    where: { barcode: normalized },
    attributes: ["id"],
  });
  if (existingPrimary)
    throw new AppError(
      "Barcode already used as primary on another product",
      409,
    );
};

const _validateVariantAssociations = async (data) => {
  if (data.store_id) {
    const store = await Store.findByPk(data.store_id, { attributes: ["id"] });
    if (!store) throw new AppError("Store not found", 404);
  }
  if (data.discount_id) {
    const discount = await Discount.findByPk(data.discount_id, {
      attributes: ["id"],
    });
    if (!discount) throw new AppError("Discount not found", 404);
  }
};

const _findProductVariant = async (product_id, variant_id) => {
  const variant = await ProductVariant.findOne({
    where: {
      id: parseInt(variant_id, 10),
      product_id: parseInt(product_id, 10),
    },
  });
  if (!variant) throw new AppError("Product variant not found", 404);
  return variant;
};

const getProductVariants = async (product_id, storeId) => {
  await getProductById(product_id, storeId);
  return ProductVariant.findAll({
    where: { product_id: parseInt(product_id, 10) },
    include: [
      {
        model: Discount,
        as: "Discount",
        attributes: _OFFER_ATTRS,
        required: false,
      },
    ],
    order: [["created_at", "ASC"]],
  });
};

const createProductVariant = async (product_id, data, storeId) => {
  await getProductById(product_id, storeId);
  await _validateVariantAssociations(data);

  if (_hasBarcode(data.barcode)) {
    await _ensureVariantBarcodeIsUnique(data.barcode);
  }

  const sanitizedData = { ...data };
  delete sanitizedData.id;
  delete sanitizedData.product_id;
  if (!_hasBarcode(sanitizedData.barcode)) {
    sanitizedData.barcode = await generateBarcode();
  }

  const variant = await ProductVariant.create({
    product_id: parseInt(product_id, 10),
    ...sanitizedData,
    store_id: sanitizedData.store_id || storeId,
    is_active: data.is_active !== undefined ? data.is_active : 1,
  });

  return variant;
};

const updateProductVariant = async (product_id, variant_id, data, storeId) => {
  await getProductById(product_id, storeId);
  const variant = await _findProductVariant(product_id, variant_id);
  await _validateVariantAssociations(data);

  if (_hasBarcode(data.barcode)) {
    await _ensureVariantBarcodeIsUnique(data.barcode, variant_id);
  }

  const sanitizedData = { ...data };
  delete sanitizedData.id;
  delete sanitizedData.product_id;
  if (!_hasBarcode(sanitizedData.barcode)) {
    delete sanitizedData.barcode; // keep existing barcode unchanged
  }
  await variant.update(sanitizedData);
  return variant;
};

const deleteProductVariant = async (product_id, variant_id, storeId) => {
  await getProductById(product_id, storeId);
  const variant = await _findProductVariant(product_id, variant_id);
  if (!variant.is_active)
    return { message: "Product variant already inactive" };
  await variant.update({ is_active: 0 });
  return { message: "Product variant deactivated successfully" };
};

const createProduct = async (data) => {
  const variants = Array.isArray(data.variants) ? data.variants : [];
  delete data.variants;
  if (data.unit && !data.unit_id) {
    throw new AppError("Use unit_id instead of unit to set the product unit. The unit field is no longer supported.", 400);
  }
  delete data.unit;

  if (!_hasBarcode(data.barcode)) {
    data.barcode = await generateBarcode();
  }

  if (data.sku) {
    const existingSku = await Product.findOne({
      where: { sku: data.sku, store_id: data.store_id },
      attributes: ["id"],
    });
    if (existingSku) throw new AppError("SKU already exists", 409);
  }
  if (data.category_id) {
    const category = await Category.findByPk(data.category_id, {
      attributes: ["id"],
    });
    if (!category) throw new AppError("Category not found", 404);
  }
  if (data.discount_id) {
    const discount = await Discount.findByPk(data.discount_id, {
      attributes: ["id"],
    });
    if (!discount) throw new AppError("Discount not found", 404);
  }
  await _applyTaxGroup(data);

  const productId = await Product.sequelize.transaction(async (transaction) => {
    const product = await Product.create(data, { transaction });
    if (variants.length) {
      const variantRows = variants.map((variant) => ({
        ...variant,
        product_id: product.id,
        store_id: variant.store_id || data.store_id,
        is_active: variant.is_active !== undefined ? variant.is_active : 1,
      }));

      for (const variant of variantRows) {
        await _validateVariantAssociations(variant);
        if (!_hasBarcode(variant.barcode)) {
          variant.barcode = await generateBarcode();
        }
      }

      await ProductVariant.bulkCreate(variantRows, { transaction });
    }
    return product.id;
  });
  // Called after commit so READ COMMITTED sees the new row
  return getProductById(productId);
};

const updateProduct = async (id, data, userId) => {
  const existingProduct = await getProductById(id);
  const variants = Array.isArray(data.variants) ? data.variants : null;
  const productData = { ...data };
  if (variants) delete productData.variants;
  if (productData.unit && !productData.unit_id) {
    throw new AppError("Use unit_id instead of unit to set the product unit. The unit field is no longer supported.", 400);
  }
  delete productData.unit;

  // Allow barcode changes with conflict check; clear is treated as keep-old
  let barcodeChanged = false;
  let oldBarcode = existingProduct.barcode;
  if (productData.barcode !== undefined) {
    if (_hasBarcode(productData.barcode)) {
      const newBarcode = String(productData.barcode).trim();
      if (newBarcode !== existingProduct.barcode) {
        if (await _hasBarcodeConflict(newBarcode, { product_id: id })) {
          throw new AppError("Barcode already exists on another product", 409);
        }
        productData.barcode = newBarcode;
        barcodeChanged = true;
      } else {
        delete productData.barcode; // no change
      }
    } else {
      delete productData.barcode; // empty input, keep existing
    }
  }

  if (!Object.keys(productData).length && (!Array.isArray(variants) || variants.length === 0))
    throw new AppError("No fields to update", 400);

  if (productData.sku) {
    const existing = await Product.findOne({
      where: { sku: productData.sku, store_id: existingProduct.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id, 10))
      throw new AppError("SKU already in use", 409);
  }
  if (productData.category_id) {
    const category = await Category.findByPk(productData.category_id, {
      attributes: ["id"],
    });
    if (!category) throw new AppError("Category not found", 404);
  }
  if (productData.discount_id) {
    const discount = await Discount.findByPk(productData.discount_id, {
      attributes: ["id"],
    });
    if (!discount) throw new AppError("Discount not found", 404);
  }
  var prevTaxGroupId = existingProduct.tax_group_id;
  var newTaxGroupId = productData.tax_group_id;
  if (newTaxGroupId === undefined) {
    productData.tax_group_id = prevTaxGroupId;
  } else if (String(newTaxGroupId) !== String(prevTaxGroupId)) {
    await _applyTaxGroup(productData);
  }

    await Product.sequelize.transaction(async (transaction) => {
    delete productData.store_id;
    if (Object.keys(productData).length) {
      await Product.update(productData, { where: { id, store_id: existingProduct.store_id }, transaction });
    }

    if (barcodeChanged && userId) {
      const inv = await ProductInventory.findOne({
        where: { product_id: parseInt(id), store_id: existingProduct.store_id },
        attributes: ["quantity"],
        transaction,
      });
      await BarcodeChangeLog.create({
        store_id: existingProduct.store_id,
        product_id: parseInt(id),
        barcode_id: null,
        old_barcode: oldBarcode,
        new_barcode: productData.barcode,
        old_type: "primary",
        new_type: "primary",
        change_type: "update",
        change_reason: "Primary barcode updated via product edit",
        changed_by: userId != null ? parseInt(userId, 10) || null : null,
        stock_at_change: inv ? parseFloat(inv.quantity) : null,
      }, { transaction });
    }

    if (variants) {
      for (const variantData of variants) {
        if (variantData.id) {
          const variant = await _findProductVariant(id, variantData.id);
          await _validateVariantAssociations(variantData);
          const sanitizedUpdates = { ...variantData };
          delete sanitizedUpdates.id;
          delete sanitizedUpdates.product_id;
          if (!_hasBarcode(sanitizedUpdates.barcode)) {
            delete sanitizedUpdates.barcode;
          }
          await variant.update(sanitizedUpdates, { transaction });
        } else {
          const newVariantBarcode = _hasBarcode(variantData.barcode)
            ? variantData.barcode
            : await generateBarcode();
          if (_hasBarcode(variantData.barcode)) {
            await _ensureVariantBarcodeIsUnique(variantData.barcode);
          }
          const newVariant = {
            ...variantData,
            product_id: parseInt(id, 10),
            store_id: variantData.store_id || existingProduct.store_id,
            barcode: newVariantBarcode,
            is_active:
              variantData.is_active !== undefined ? variantData.is_active : 1,
          };
          delete newVariant.id;
          await _validateVariantAssociations(newVariant);
          await ProductVariant.create(newVariant, { transaction });
        }
      }
    }

  });
  return getProductById(id);
};

const deleteProduct = async (id) => {
  const product = await getProductById(id);
  await Product.update({ is_active: 0 }, { where: { id, store_id: product.store_id } });
  return { message: "Product deactivated successfully" };
};

// Assign/replace the set of offers linked to a product via offer_products table.
const setProductOfferAssignments = async (
  product_id,
  offer_ids = [],
  storeId,
) => {
  await getProductById(product_id, storeId);
  await Product.sequelize.transaction(async (transaction) => {
    await OfferProduct.destroy({ where: { product_id: parseInt(product_id) }, transaction });
    if (offer_ids.length > 0) {
      const records = offer_ids.map((offer_id, idx) => ({
        offer_id: parseInt(offer_id),
        product_id: parseInt(product_id),
        sequence: idx,
        created_at: new Date(),
      }));
      await OfferProduct.bulkCreate(records, { transaction });
    }
  });
  return getProductById(product_id);
};

const lookupByBarcode = async (barcode, store_id) => {
  const now = new Date();
  const results = [];

  const _productInclude = [
    { model: Category, attributes: ["id", "name", "slug"] },
    { model: Unit, as: "UnitRef", attributes: ["name"] },
    {
      model: TaxGroup,
      as: "TaxGroup",
      attributes: ["id", "name", "tax_type", "rate"],
      required: false,
    },
    {
      model: ProductInventory,
      where: store_id ? { store_id } : {},
      attributes: ["quantity", "store_id", "variant_id"],
      required: false,
    },
    {
      model: Discount,
      as: "Discount",
      attributes: _OFFER_ATTRS,
      required: false,
    },
  ];

  const storeFilter = store_id ? { store_id: parseInt(store_id) } : {};

  // 1. product_barcodes table (alternate / promo / primary entries)
  const bcRows = await ProductBarcode.findAll({
    where: {
      barcode,
      is_active: 1,
      [Op.and]: [
        { [Op.or]: [{ valid_from: null }, { valid_from: { [Op.lte]: now } }] },
        { [Op.or]: [{ valid_to: null }, { valid_to: { [Op.gte]: now } }] },
      ],
    },
    include: [
      { model: Product, as: "Product", where: { is_active: 1, ...storeFilter }, include: _productInclude },
      {
        model: Discount,
        as: "Offer",
        attributes: _OFFER_ATTRS,
        required: false,
      },
    ],
  });
  for (const bcRow of bcRows) {
    if (bcRow.Product) {
      results.push({
        product: bcRow.Product,
        variant: null,
        barcode_row: bcRow,
        offer: bcRow.Offer || null,
        source: "barcode_table",
      });
    }
  }

  // 2. product_variants.barcode
  const variants = await ProductVariant.findAll({
    where: { barcode, is_active: 1 },
    include: [
      { model: Product, where: { is_active: 1, ...storeFilter }, include: _productInclude },
      {
        model: Discount,
        as: "Discount",
        attributes: _OFFER_ATTRS,
        required: false,
      },
    ],
  });
  for (const variant of variants) {
    if (variant.Product) {
      results.push({
        product: variant.Product,
        variant,
        barcode_row: null,
        offer: variant.Discount || null,
        source: "variant",
      });
    }
  }

  // 3. products.barcode (primary field)
  const products = await Product.findAll({
    where: { barcode, is_active: 1, ...storeFilter },
    include: _productInclude,
  });
  for (const product of products) {
    results.push({
      product,
      variant: null,
      barcode_row: null,
      offer: null,
      source: "product_primary",
    });
  }

  if (results.length === 0)
    throw new AppError("No product found for this barcode", 404);

  return results;
};

// ─── Stock check for a barcode (for migration planning) ──────────────────────
const getBarcodeStock = async (barcode, store_id) => {
  const results = await lookupByBarcode(barcode, store_id).catch(() => null);
  if (!results || !results.length)
    return { barcode, product: null, stock: null };

  const result = results[0];
  const inventory = result.product.ProductInventories || [];
  const stock = inventory.length ? parseFloat(inventory[0].quantity) : 0;

  return {
    barcode,
    product: {
      id: result.product.id,
      name: result.product.name,
      sku: result.product.sku,
    },
    source: result.source,
    stock,
    store_id: store_id || null,
  };
};

// ─── Get barcodes for a product ──────────────────────────────────────────────
const getProductBarcodes = async (product_id, storeId) => {
  await getProductById(product_id, storeId);
  return ProductBarcode.findAll({
    where: { product_id: parseInt(product_id) },
    include: [
      {
        model: Discount,
        as: "Offer",
        attributes: _OFFER_ATTRS,
        required: false,
      },
    ],
    order: [
      ["type", "ASC"], // primary first
      ["created_at", "ASC"],
    ],
  });
};

// ─── Add a barcode to a product ──────────────────────────────────────────────
const addProductBarcode = async (product_id, data, user_id, store_id) => {
  await getProductById(product_id, store_id);

  const { type = "alternate", offer_id, valid_from, valid_to, notes } = data;
  const barcode = _hasBarcode(data.barcode)
    ? String(data.barcode).trim()
    : await generateBarcode();

  // Validate offer if supplied
  if (offer_id) {
    const offer = await Discount.findByPk(offer_id, { attributes: ["id"] });
    if (!offer) throw new AppError("Linked offer not found", 404);
  }

  if (await _hasBarcodeConflict(barcode)) {
    throw new AppError("Barcode already exists on another product", 409);
  }

  const bcRow = await ProductBarcode.create({
    product_id: parseInt(product_id),
    barcode,
    type,
    offer_id: offer_id || null,
    valid_from: valid_from || null,
    valid_to: valid_to || null,
    notes: notes || null,
    is_active: 1,
  });

  // Get current stock for audit snapshot
  const inv = store_id
    ? await ProductInventory.findOne({
        where: { product_id, store_id },
        attributes: ["quantity"],
      })
    : null;

  await BarcodeChangeLog.create({
    store_id: store_id != null ? parseInt(store_id) : null,
    product_id: parseInt(product_id),
    barcode_id: bcRow.id,
    old_barcode: null,
    new_barcode: barcode,
    old_type: null,
    new_type: type,
    old_offer_id: null,
    new_offer_id: offer_id || null,
    change_type: "add",
    change_reason: notes || null,
    changed_by: user_id != null ? parseInt(user_id, 10) || null : null,
    stock_at_change: inv ? parseFloat(inv.quantity) : null,
  });

  return bcRow;
};

// ─── Update an existing barcode entry ────────────────────────────────────────
const updateProductBarcode = async (
  product_id,
  barcode_id,
  data,
  user_id,
  store_id,
) => {
  await getProductById(product_id, store_id);

  const bcRow = await ProductBarcode.findOne({
    where: { id: parseInt(barcode_id), product_id: parseInt(product_id) },
  });
  if (!bcRow) throw new AppError("Barcode not found for this product", 404);

  if (data.offer_id) {
    const offer = await Discount.findByPk(data.offer_id, {
      attributes: ["id"],
    });
    if (!offer) throw new AppError("Linked offer not found", 404);
  }

  const snapshot = {
    old_barcode: bcRow.barcode,
    old_type: bcRow.type,
    old_offer_id: bcRow.offer_id,
  };

  if (data.barcode !== undefined && data.barcode !== null && String(data.barcode).trim()) {
    const newBarcode = String(data.barcode).trim();
    if (newBarcode !== bcRow.barcode) {
      if (await _hasBarcodeConflict(newBarcode, { product_barcode_id: bcRow.id })) {
        throw new AppError("Barcode already exists on another product", 409);
      }
      data.barcode = newBarcode;
    } else {
      delete data.barcode;
    }
  }

  await bcRow.update({
    barcode: data.barcode !== undefined ? data.barcode : bcRow.barcode,
    type: data.type !== undefined ? data.type : bcRow.type,
    offer_id: data.offer_id !== undefined ? data.offer_id : bcRow.offer_id,
    valid_from:
      data.valid_from !== undefined ? data.valid_from : bcRow.valid_from,
    valid_to: data.valid_to !== undefined ? data.valid_to : bcRow.valid_to,
    notes: data.notes !== undefined ? data.notes : bcRow.notes,
  });

  const inv = store_id
    ? await ProductInventory.findOne({
        where: { product_id, store_id },
        attributes: ["quantity"],
      })
    : null;

  await BarcodeChangeLog.create({
    store_id: store_id != null ? parseInt(store_id) : null,
    product_id: parseInt(product_id),
    barcode_id: bcRow.id,
    old_barcode: snapshot.old_barcode,
    new_barcode: bcRow.barcode,
    old_type: snapshot.old_type,
    new_type: bcRow.type,
    old_offer_id: snapshot.old_offer_id,
    new_offer_id: bcRow.offer_id,
    change_type: "update",
    change_reason: data.change_reason || null,
    changed_by: user_id != null ? parseInt(user_id, 10) || null : null,
    stock_at_change: inv ? parseFloat(inv.quantity) : null,
  });

  return bcRow;
};

// ─── Deactivate (retire) a barcode ───────────────────────────────────────────
const deactivateProductBarcode = async (
  product_id,
  barcode_id,
  change_reason,
  user_id,
  store_id,
) => {
  await getProductById(product_id, store_id);

  const bcRow = await ProductBarcode.findOne({
    where: { id: parseInt(barcode_id), product_id: parseInt(product_id) },
  });
  if (!bcRow) throw new AppError("Barcode not found for this product", 404);

  const inv = store_id
    ? await ProductInventory.findOne({
        where: { product_id, store_id },
        attributes: ["quantity"],
      })
    : null;

  await BarcodeChangeLog.create({
    store_id: store_id != null ? parseInt(store_id) : null,
    product_id: parseInt(product_id),
    barcode_id: bcRow.id,
    old_barcode: bcRow.barcode,
    new_barcode: null,
    old_type: bcRow.type,
    new_type: null,
    old_offer_id: bcRow.offer_id,
    new_offer_id: null,
    change_type: "deactivate",
    change_reason: change_reason || null,
    changed_by: user_id != null ? parseInt(user_id, 10) || null : null,
    stock_at_change: inv ? parseFloat(inv.quantity) : null,
  });

  await bcRow.update({ is_active: 0 });
  return { message: "Barcode deactivated", barcode: bcRow.barcode };
};

// ─── Get barcode change history for a product ────────────────────────────────
const getBarcodeChangeLogs = async (product_id) => {
  return BarcodeChangeLog.findAll({
    where: { product_id: parseInt(product_id) },
    include: [
      {
        model: require("../../database/index").User,
        as: "ChangedBy",
        attributes: ["id", "name"],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

// ─── All barcodes for a product (print selection) ────────────────────────────
const getAllBarcodesForPrint = async (product_id, storeId) => {
  const product = await Product.findByPk(product_id, {
    attributes: [
      "id",
      "store_id",
      "name",
      "sku",
      "barcode",
      "mrp",
      "selling_price",
      "brand",
    ],
    include: [
      { model: Category, attributes: ["name"], required: false },
      {
        model: ProductBarcode,
        as: "ProductBarcodes",
        attributes: ["id", "barcode", "type", "notes"],
        where: { is_active: true },
        required: false,
      },
      {
        model: ProductVariant,
        as: "Variants",
        attributes: [
          "id",
          "variant_name",
          "sku",
          "barcode",
          "mrp",
          "selling_price",
        ],
        where: { is_active: 1 },
        required: false,
      },
    ],
  });
  if (!product || (storeId && product.store_id !== parseInt(storeId, 10)))
    throw new AppError("Product not found", 404);

  const base = {
    product_id: product.id,
    name: product.name,
    brand: product.brand || null,
    category: product.Category ? product.Category.name : null,
    sku: product.sku,
    mrp: parseFloat(product.mrp || 0),
    selling_price: parseFloat(product.selling_price || 0),
  };

  const primary = product.barcode
    ? {
        source: "primary",
        label: "Primary",
        barcode: product.barcode,
        name: product.name,
        mrp: base.mrp,
        selling_price: base.selling_price,
      }
    : null;

  const alternates = (product.ProductBarcodes || []).map((b) => ({
    source: "alternate",
    barcode_id: b.id,
    label: b.type
      ? b.type.charAt(0).toUpperCase() + b.type.slice(1)
      : "Alternate",
    barcode: b.barcode,
    type: b.type,
    notes: b.notes || null,
    name: product.name,
    mrp: base.mrp,
    selling_price: base.selling_price,
  }));

  const variants = (product.Variants || [])
    .filter((v) => v.barcode)
    .map((v) => ({
      source: "variant",
      variant_id: v.id,
      label: v.variant_name || v.sku || "Variant",
      barcode: v.barcode,
      sku: v.sku || product.sku,
      name: product.name + (v.variant_name ? " – " + v.variant_name : ""),
      mrp: parseFloat(v.mrp || product.mrp || 0),
      selling_price: parseFloat(v.selling_price || product.selling_price || 0),
    }));

  return { ...base, primary, alternates, variants };
};

// ─── Barcode Print Data (single product) ─────────────────────────────────────
const _barcodeIncludes = {
  model: ProductBarcode,
  as: "ProductBarcodes",
  attributes: ["id", "barcode", "type"],
  where: { is_active: true },
  required: false,
};

// Primary barcode: product.barcode first, fallback to first active alternate
const _resolveBarcode = (product) => {
  if (product.barcode) return product.barcode;
  const alts = product.ProductBarcodes || [];
  return alts.length ? alts[0].barcode : null;
};

// Alternate barcodes excluding the primary
const _alternates = (product) => {
  const primary = product.barcode;
  return (product.ProductBarcodes || [])
    .filter((b) => b.barcode !== primary)
    .map((b) => ({ id: b.id, barcode: b.barcode, type: b.type || null }));
};

const _formatProduct = (product, quantity = 1) => ({
  product_id: product.id,
  name: product.name,
  brand: product.brand || null,
  category: product.Category ? product.Category.name : null,
  sku: product.sku,
  barcode: _resolveBarcode(product),
  alternate_barcodes: _alternates(product),
  mrp: parseFloat(product.mrp || 0),
  selling_price: parseFloat(product.selling_price || 0),
  quantity,
});

const getBarcodePrintData = async (product_id, storeId) => {
  const product = await Product.findByPk(product_id, {
    attributes: [
      "id",
      "name",
      "sku",
      "barcode",
      "mrp",
      "selling_price",
      "brand",
      "store_id",
    ],
    include: [
      { model: Category, attributes: ["name"], required: false },
      _barcodeIncludes,
    ],
  });
  if (!product || (storeId && product.store_id !== parseInt(storeId, 10)))
    throw new AppError("Product not found", 404);
  return _formatProduct(product);
};

// ─── Bulk Barcode Print Data ──────────────────────────────────────────────────
const getBulkBarcodePrintData = async (items, storeId) => {
  const ids = items.map((i) => i.product_id);
  const where = { id: ids };
  if (storeId) where.store_id = parseInt(storeId, 10);
  const products = await Product.findAll({
    where,
    attributes: [
      "id",
      "name",
      "sku",
      "barcode",
      "mrp",
      "selling_price",
      "brand",
    ],
    include: [
      { model: Category, attributes: ["name"], required: false },
      _barcodeIncludes,
    ],
  });

  const productMap = {};
  products.forEach((p) => {
    productMap[p.id] = p;
  });

  return items
    .filter((item) => productMap[item.product_id])
    .map((item) =>
      _formatProduct(productMap[item.product_id], parseInt(item.quantity) || 1),
    );
};

// ─── Store-Specific Product Pricing ──────────────────────────────────────────

const bulkPriceUpdate = async (store_id, { category_id, price_field, adjustment_type, adjustment_value, direction }) => {
  const where = { store_id: parseInt(store_id, 10), is_active: 1 };
  if (category_id) where.category_id = parseInt(category_id);

  const multiplier = direction === "decrease" ? -1 : 1;
  const effectiveValue = adjustment_value * multiplier;

  const products = await Product.findAll({ where, attributes: ["id", "purchase_price", "selling_price", "mrp"] });
  if (!products.length) throw new AppError("No products matched", 404);

  let updatedCount = 0;
  await Product.sequelize.transaction(async (transaction) => {
    for (const product of products) {
      const oldPrice = parseFloat(product[price_field]) || 0;
      if (oldPrice === 0 && adjustment_type === "margin") continue;

      let newPrice;
      if (adjustment_type === "percent") {
        newPrice = oldPrice + oldPrice * (effectiveValue / 100);
      } else if (adjustment_type === "flat") {
        newPrice = oldPrice + effectiveValue;
      } else if (adjustment_type === "margin") {
        const cost = parseFloat(product.purchase_price) || 0;
        if (cost === 0 && price_field !== "purchase_price") continue;
        const base = price_field === "purchase_price" ? oldPrice : cost;
        newPrice = base * (1 + effectiveValue / 100);
      }

      if (newPrice !== undefined) {
        newPrice = Math.round(newPrice * 100) / 100;
        if (newPrice >= 0 && newPrice !== oldPrice) {
          await Product.update(
            { [price_field]: newPrice },
            { where: { id: product.id }, transaction },
          );
          updatedCount++;
        }
      }
    }
  });

  return { updated: updatedCount, total: products.length };
};

const getStoreProductPrice = async (product_id, store_id) => {
  await getProductById(product_id, store_id);
  const record = await StoreProductPrice.findOne({
    where: { product_id, store_id },
  });
  return record ? { price: record.price, store_id, product_id } : null;
};

const deleteStoreProductPrice = async (product_id, store_id) => {
  await getProductById(product_id, store_id);
  const deleted = await StoreProductPrice.destroy({
    where: { product_id, store_id: parseInt(store_id, 10) },
  });
  if (!deleted) throw new AppError("No store price override found", 404);
  return { message: "Store price override removed" };
};

const setStoreProductPrice = async (product_id, store_id, price) => {
  await getProductById(product_id, store_id);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0)
    throw new AppError("Price must be a non-negative number", 400);
  const [record] = await StoreProductPrice.upsert(
    { product_id, store_id: parseInt(store_id, 10), price: parsedPrice },
    { returning: true },
  );
  return { price: parsedPrice, store_id, product_id };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  setProductOfferAssignments,
  // Barcode management
  generateBarcode,
  lookupByBarcode,
  getBarcodeStock,
  getProductBarcodes,
  addProductBarcode,
  updateProductBarcode,
  deactivateProductBarcode,
  getBarcodeChangeLogs,
  // Barcode print
  getAllBarcodesForPrint,
  getBarcodePrintData,
  getBulkBarcodePrintData,
  // Store-specific pricing
  getStoreProductPrice,
  setStoreProductPrice,
  deleteStoreProductPrice,
  bulkPriceUpdate,
};
