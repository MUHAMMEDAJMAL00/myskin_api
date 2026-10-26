const Joi = require("joi");

const createSale = Joi.object({
  store_id: Joi.number().integer().optional(),
  customer_id: Joi.number().integer().allow(null),
  quotation_id: Joi.number().integer().allow(null),
  promo_discount_id: Joi.number().integer().allow(null),
  promo_discount_amount: Joi.number().precision(2).min(0).default(0),
  discount_code: Joi.string().allow("", null),
  sale_date: Joi.date()
    .iso()
    .default(() => new Date()),
  status: Joi.string()
    .valid("completed", "pending", "cancelled", "returned", "partial_return", "confirmed", "processing", "shipped", "delivered")
    .default("completed"),
  source: Joi.string().valid("pos", "online").default("pos"),
  discount_type: Joi.string().valid("none", "flat", "percent").default("none"),
  discount_value: Joi.number().precision(2).min(0).default(0),
  shipping_charge: Joi.number().precision(2).min(0).default(0),
  notes: Joi.string().allow("", null),
  invoice_tax_mode: Joi.string().valid("product", "invoice", "exempt").default("product"),
  invoice_tax_group_id: Joi.number().integer().allow(null),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        variant_id: Joi.number().integer().allow(null),
        quantity: Joi.number().precision(3).min(0.001).required(),
        unit_price: Joi.number().precision(2).min(0).required(),
        discount_type: Joi.string()
          .valid("none", "flat", "percent")
          .default("none"),
        discount_value: Joi.number().precision(2).min(0).default(0),
        tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
      }),
    )
    .min(1)
    .required(),
  payments: Joi.array()
    .items(
      Joi.object({
        payment_method: Joi.string()
          .valid("cash", "card", "upi", "bank", "credit", "loyalty_points", "other")
          .required(),
        payment_source_name: Joi.string().allow("", null),
        amount: Joi.number().precision(2).min(0.01).required(),
        reference_number: Joi.string().allow("", null),
        notes: Joi.string().allow("", null),
      }),
    )
    .min(1)
    .required(),
});

const updateSaleStatus = Joi.object({
  status: Joi.string().valid("completed", "pending", "cancelled", "returned", "partial_return", "confirmed", "processing", "shipped", "delivered").required(),
  notes: Joi.string().allow("", null).optional(),
});

const addPayment = Joi.object({
  payment_method: Joi.string()
    .valid("cash", "card", "upi", "bank", "credit", "loyalty_points", "other")
    .required(),
  payment_source_name: Joi.string().allow("", null),
  amount: Joi.number().precision(2).min(0.01).required(),
  reference_number: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
  payment_date: Joi.date().iso().allow(null),
});

module.exports = { createSale, updateSaleStatus, addPayment };
