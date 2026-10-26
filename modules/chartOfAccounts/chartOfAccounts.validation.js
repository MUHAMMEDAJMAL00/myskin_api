"use strict";
const Joi = require("joi");

const createCategory = Joi.object({
  name: Joi.string().max(100).required(),
  group: Joi.string().valid("Asset", "Liability", "Expenditure", "Income", "Equity").required(),
});

const updateCategory = Joi.object({
  name: Joi.string().max(100),
  group: Joi.string().valid("Asset", "Liability", "Expenditure", "Income", "Equity"),
}).min(1);

const createAccount = Joi.object({
  category_id: Joi.number().integer().required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().allow("", null),
  opening_balance: Joi.number().precision(2).default(0),
});

const updateAccount = Joi.object({
  category_id: Joi.number().integer(),
  name: Joi.string().max(100),
  description: Joi.string().allow("", null),
  opening_balance: Joi.number().precision(2),
}).min(1);

module.exports = {
  createCategory,
  updateCategory,
  createAccount,
  updateAccount,
};
