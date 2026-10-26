"use strict";
const Joi = require("joi");

const createCategory = Joi.object({
  store_id: Joi.number().integer().required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().allow("", null),
});

const updateCategory = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1),
}).min(1);

const createExpense = Joi.object({
  store_id: Joi.number().integer().required(),
  category_id: Joi.number().integer().allow(null).default(null),
  title: Joi.string().max(150).required(),
  description: Joi.string().allow("", null),
  amount: Joi.number().precision(2).min(0.01).required(),
  payment_method: Joi.string()
    .valid("cash", "card", "upi", "bank", "other")
    .default("cash"),
  reference_number: Joi.string().max(100).allow("", null),
  expense_date: Joi.date().iso().required(),
  receipt_url: Joi.string().uri().allow("", null),
  notes: Joi.string().allow("", null),
  status: Joi.string()
    .valid("pending", "approved", "rejected")
    .default("approved"),
});

const updateExpense = Joi.object({
  category_id: Joi.number().integer().allow(null),
  title: Joi.string().max(150),
  description: Joi.string().allow("", null),
  amount: Joi.number().precision(2).min(0.01),
  payment_method: Joi.string().valid("cash", "card", "upi", "bank", "other"),
  reference_number: Joi.string().max(100).allow("", null),
  expense_date: Joi.date().iso(),
  receipt_url: Joi.string().uri().allow("", null),
  notes: Joi.string().allow("", null),
  status: Joi.string().valid("pending", "approved", "rejected"),
}).min(1);

module.exports = {
  createCategory,
  updateCategory,
  createExpense,
  updateExpense,
};
