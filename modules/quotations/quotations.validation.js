const Joi = require("joi");

const itemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  product_name: Joi.string().allow("", null).optional(),
  quantity: Joi.number().precision(3).min(0.001).required(),
  unit_price: Joi.number().precision(2).min(0).required(),
  discount_amount: Joi.number().precision(2).min(0).default(0),
  tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
});

const updateItemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  product_name: Joi.string().allow("", null).optional(),
  quantity: Joi.number().precision(3).min(0.001).required(),
  unit_price: Joi.number().precision(2).min(0).optional(),
  discount_amount: Joi.number().precision(2).min(0).default(0),
  tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
});

const createQuotation = Joi.object({
  store_id: Joi.number().integer().required(),
  customer_id: Joi.number().integer().allow(null),
  customer_name: Joi.string().max(150).allow("", null),
  valid_until: Joi.date().iso().allow(null),
  notes: Joi.string().allow("", null),
  items: Joi.array().items(itemSchema).min(1).required(),
});

// updateQuotation: same fields as create but all optional — at least one required
const updateQuotation = Joi.object({
  customer_id: Joi.number().integer().allow(null),
  customer_name: Joi.string().max(150).allow("", null),
  valid_until: Joi.date().iso().allow(null),
  notes: Joi.string().allow("", null),
  change_notes: Joi.string().max(255).allow("", null),
  items: Joi.array().items(updateItemSchema).min(1),
}).min(1);

// "converted" is reserved for system use only — not user-settable
const updateQuotationStatus = Joi.object({
  status: Joi.string()
    .valid("pending", "approved", "rejected", "expired", "cancelled")
    .required(),
});

const convertQuotation = Joi.object({
  payment_method: Joi.string()
    .valid("cash", "card", "upi", "bank", "credit", "other")
    .default("cash"),
  amount: Joi.number().precision(2).min(0).default(0),
});

module.exports = { createQuotation, updateQuotation, updateQuotationStatus, convertQuotation };
