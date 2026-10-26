const Joi = require("joi");

const createStore = Joi.object({
  name: Joi.string().max(150).required(),
  code: Joi.string().max(20).required(),
  address: Joi.string().allow("", null),
  phone: Joi.string().max(20).allow("", null),
  email: Joi.string().email().max(100).allow("", null),
  currency: Joi.string().max(10).default("INR"),
  timezone: Joi.string().max(50).default("Asia/Kolkata"),
  allow_negative_stock: Joi.number().valid(0, 1).default(0),
});

const updateStore = Joi.object({
  name: Joi.string().max(150),
  address: Joi.string().allow("", null),
  phone: Joi.string().max(20).allow("", null),
  email: Joi.string().email().max(100).allow("", null),
  currency: Joi.string().max(10),
  timezone: Joi.string().max(50),
  is_active: Joi.number().valid(0, 1),
  allow_negative_stock: Joi.number().valid(0, 1),
});

module.exports = { createStore, updateStore };
