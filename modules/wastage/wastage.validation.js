"use strict";
const Joi = require("joi");

const createWastage = Joi.object({
  product_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  quantity: Joi.number().precision(3).min(0.001).required(),
  reason: Joi.string().valid("damaged", "expired", "lost", "other").default("damaged"),
  notes: Joi.string().allow("", null),
  reference_number: Joi.string().max(100).allow("", null),
});

module.exports = { createWastage };
