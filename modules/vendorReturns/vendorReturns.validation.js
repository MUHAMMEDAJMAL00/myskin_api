"use strict";
const Joi = require("joi");

const createVendorReturn = Joi.object({
  vendor_id: Joi.number().integer().required(),
  product_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  quantity: Joi.number().precision(3).min(0.001).required(),
  reason: Joi.string().max(100).required(),
  notes: Joi.string().allow("", null),
  reference_number: Joi.string().max(50).allow("", null),
  purchase_id: Joi.number().integer().allow(null),
  return_action: Joi.string().valid("refund", "replacement", "repair", "other").default("refund"),
  refund_amount: Joi.number().precision(2).min(0).default(0),
});

module.exports = { createVendorReturn };
