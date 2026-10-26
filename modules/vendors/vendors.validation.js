const Joi = require("joi");

const createVendor = Joi.object({
  name: Joi.string().max(150).required(),
  company: Joi.string().max(150).allow("", null),
  email: Joi.string().email().max(100).allow("", null),
  phone: Joi.string().max(20).allow("", null),
  address: Joi.string().allow("", null),
  city: Joi.string().max(100).allow("", null),
  state: Joi.string().max(100).allow("", null),
  country: Joi.string().max(100).default("India"),
  postal_code: Joi.string().max(20).allow("", null),
  tax_number: Joi.string().max(50).allow("", null),
  opening_balance: Joi.number().precision(2).default(0),
  notes: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1).default(1),
});

const updateVendor = Joi.object({
  name: Joi.string().max(150),
  company: Joi.string().max(150).allow("", null),
  email: Joi.string().email().max(100).allow("", null),
  phone: Joi.string().max(20).allow("", null),
  address: Joi.string().allow("", null),
  city: Joi.string().max(100).allow("", null),
  state: Joi.string().max(100).allow("", null),
  country: Joi.string().max(100),
  postal_code: Joi.string().max(20).allow("", null),
  tax_number: Joi.string().max(50).allow("", null),
  notes: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1),
});

module.exports = { createVendor, updateVendor };
