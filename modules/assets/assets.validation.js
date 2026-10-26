"use strict";
const Joi = require("joi");

const createAsset = Joi.object({
  name: Joi.string().max(150).required(),
  category: Joi.string().max(100).allow("", null),
  purchase_date: Joi.date().iso().allow(null),
  purchase_value: Joi.number().precision(2).min(0).required(),
  depreciation_rate: Joi.number().precision(2).min(0).max(100).default(0),
  notes: Joi.string().allow("", null),
  payment_method: Joi.string().valid("cash", "card", "upi", "bank", "other").allow(null),
});

const postDepreciation = Joi.object({
  amount: Joi.number().precision(2).positive().required(),
  date: Joi.date().iso().allow(null),
});

module.exports = { createAsset, postDepreciation };
