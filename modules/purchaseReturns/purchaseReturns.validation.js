"use strict";
const Joi = require("joi");

const itemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  purchase_item_id: Joi.number().integer().allow(null),
  quantity: Joi.number().precision(3).min(0.001).required(),
  unit_price: Joi.number().precision(2).min(0).default(0),
  tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
  reason: Joi.string().allow("", null),
});

const createPurchaseReturn = Joi.object({
  store_id: Joi.number().integer().required(),
  vendor_id: Joi.number().integer().required(),
  purchase_id: Joi.number().integer().allow(null),
  return_date: Joi.date().iso().allow(null),
  reason: Joi.string().max(255).allow("", null),
  notes: Joi.string().allow("", null),
  refund_method: Joi.string().valid("cash", "bank_transfer", "credit_note", "debit_note", "adjustment").default("adjustment"),
  items: Joi.array().items(itemSchema).min(1).required(),
});

module.exports = { createPurchaseReturn };
