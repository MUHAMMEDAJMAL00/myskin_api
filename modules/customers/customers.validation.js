const Joi = require("joi");

const createCustomer = Joi.object({
  name: Joi.string().max(150).required(),
  email: Joi.string().email().max(100).allow("", null),
  phone: Joi.string().max(20).allow("", null),
  address: Joi.string().allow("", null),
  city: Joi.string().max(100).allow("", null),
  state: Joi.string().max(100).allow("", null),
  country: Joi.string().max(100).default("India"),
  postal_code: Joi.string().max(20).allow("", null),
  date_of_birth: Joi.date().iso().allow(null),
  gender: Joi.string().valid("male", "female", "other").allow(null),
  loyalty_points: Joi.number().integer().min(0).default(0),
  opening_balance: Joi.number().precision(2).default(0),
  credit_limit: Joi.number().precision(2).min(0).allow(null),
  notes: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1).default(1),
});

const updateCustomer = Joi.object({
  name: Joi.string().max(150),
  email: Joi.string().email().max(100).allow("", null),
  phone: Joi.string().max(20).allow("", null),
  address: Joi.string().allow("", null),
  city: Joi.string().max(100).allow("", null),
  state: Joi.string().max(100).allow("", null),
  country: Joi.string().max(100),
  postal_code: Joi.string().max(20).allow("", null),
  date_of_birth: Joi.date().iso().allow(null),
  gender: Joi.string().valid("male", "female", "other").allow(null),
  loyalty_points: Joi.number().integer().min(0),
  credit_limit: Joi.number().precision(2).min(0).allow(null),
  notes: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1),
});

module.exports = { createCustomer, updateCustomer };
