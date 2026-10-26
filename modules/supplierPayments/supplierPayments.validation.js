"use strict";
const Joi = require("joi");

const createPayment = Joi.object({
  vendor_id: Joi.number().integer().required(),
  purchase_id: Joi.number().integer().allow(null),
  amount: Joi.number().precision(2).positive().required(),
  payment_method: Joi.string().max(30).required(),
  reference_number: Joi.string().max(100).allow("", null),
  notes: Joi.string().allow("", null),
});

module.exports = { createPayment };
