const Joi = require("joi");

const createProduct = Joi.object({
  category_id: Joi.number().integer().allow(null),
  tax_group_id: Joi.number().integer().allow(null),
  /* ✔ NEW */
  discount_id: Joi.number().integer().allow(null),
  name: Joi.string().max(200).required(),
  sku: Joi.string()
    .max(100)
    .pattern(/^[A-Z0-9_-]+$/i)
    .required(),
  barcode: Joi.string().max(100).allow("", null),
  hsn_code: Joi.string().max(20).allow("", null),
  description: Joi.string().allow("", null),
  brand: Joi.string().max(100).allow("", null),
  unit_id: Joi.number().integer().allow(null),
  unit_value: Joi.string().max(20).allow("", null),
  purchase_price: Joi.number().precision(2).min(0).default(0),
  selling_price: Joi.number().precision(2).min(0).required(),
  mrp: Joi.number().precision(2).min(0).allow(null),
  tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
  tax_included: Joi.number().valid(0, 1).default(0),
  image_url: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1).default(1),
  is_service: Joi.number().valid(0, 1).default(0),
  alert_quantity: Joi.number().integer().min(0).default(5),
  max_quantity: Joi.number().integer().min(0).allow(null),
  variants: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        store_id: Joi.number().integer().optional(),
        variant_name: Joi.string().max(100).required(),
        sku: Joi.string().max(100).allow("", null),
        barcode: Joi.string().max(100).allow("", null),
        purchase_price: Joi.number().precision(2).min(0).required(),
        selling_price: Joi.number().precision(2).min(0).required(),
        mrp: Joi.number().precision(2).min(0).allow(null),
        discount_id: Joi.number().integer().allow(null),
        quantity: Joi.number().precision(3).allow(null),
        unit: Joi.string().max(20).allow("", null),
        is_active: Joi.number().valid(0, 1).default(1),
      }),
    )
    .optional(),
});

const updateProduct = Joi.object({
  category_id: Joi.number().integer().allow(null),
  tax_group_id: Joi.number().integer().allow(null),
  /* ✔ NEW */
  discount_id: Joi.number().integer().allow(null),
  name: Joi.string().max(200),
  sku: Joi.string()
    .max(100)
    .pattern(/^[A-Z0-9_-]+$/i)
    .optional(),
  barcode: Joi.string().max(100).allow("", null),
  hsn_code: Joi.string().max(20).allow("", null),
  description: Joi.string().allow("", null),
  brand: Joi.string().max(100).allow("", null),
  unit_id: Joi.number().integer().allow(null),
  unit_value: Joi.string().max(20).allow("", null),
  purchase_price: Joi.number().precision(2).min(0),
  selling_price: Joi.number().precision(2).min(0),
  mrp: Joi.number().precision(2).min(0).allow(null),
  tax_rate: Joi.number().precision(2).min(0).max(100),
  tax_included: Joi.number().valid(0, 1),
  image_url: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1),
  is_service: Joi.number().valid(0, 1),
  alert_quantity: Joi.number().integer().min(0),
  max_quantity: Joi.number().integer().min(0).allow(null),
  variants: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        store_id: Joi.number().integer().optional(),
        variant_name: Joi.string().max(100).required(),
        sku: Joi.string().max(100).allow("", null),
        barcode: Joi.string().max(100).allow("", null),
        purchase_price: Joi.number().precision(2).min(0).required(),
        selling_price: Joi.number().precision(2).min(0).required(),
        mrp: Joi.number().precision(2).min(0).allow(null),
        discount_id: Joi.number().integer().allow(null),
        quantity: Joi.number().precision(3).allow(null),
        unit: Joi.string().max(20).allow("", null),
        is_active: Joi.number().valid(0, 1).default(1),
      }),
    )
    .optional(),
});

const variantBase = Joi.object({
  store_id: Joi.number().integer().optional(),
  variant_name: Joi.string().max(100).required(),
  sku: Joi.string().max(100).allow("", null),
  barcode: Joi.string().max(100).allow("", null),
  purchase_price: Joi.number().precision(2).min(0).required(),
  selling_price: Joi.number().precision(2).min(0).required(),
  mrp: Joi.number().precision(2).min(0).allow(null),
  discount_id: Joi.number().integer().allow(null),
  quantity: Joi.number().precision(3).allow(null),
  unit: Joi.string().max(20).allow("", null),
  image_url: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1).default(1),
});

const createProductVariant = variantBase;
const updateProductVariant = variantBase.fork(
  ["store_id", "variant_name", "purchase_price", "selling_price"],
  (schema) => schema.optional(),
);

module.exports = {
  createProduct,
  updateProduct,
  createProductVariant,
  updateProductVariant,
  addBarcode: Joi.object({
    barcode: Joi.string().max(100).allow("", null),
    type: Joi.string().valid("primary", "alternate", "supplier", "promo").default("alternate"),
    offer_id: Joi.number().integer().allow(null),
    valid_from: Joi.date().iso().allow(null),
    valid_to: Joi.date().iso().allow(null),
    notes: Joi.string().max(500).allow("", null),
  }),
  updateBarcode: Joi.object({
    barcode: Joi.string().max(100).allow("", null),
    type: Joi.string().valid("primary", "alternate", "supplier", "promo"),
    offer_id: Joi.number().integer().allow(null),
    valid_from: Joi.date().iso().allow(null),
    valid_to: Joi.date().iso().allow(null),
    notes: Joi.string().max(500).allow("", null),
    change_reason: Joi.string().max(500).allow("", null),
  }),
  bulkPriceUpdate: Joi.object({
    category_id: Joi.number().integer().allow(null),
    price_field: Joi.string().valid("selling_price", "purchase_price", "mrp").required(),
    adjustment_type: Joi.string().valid("percent", "flat", "margin").required(),
    adjustment_value: Joi.number().required(),
    direction: Joi.string().valid("increase", "decrease").default("increase"),
  }),
};
