"use strict";

const Joi = require("joi");

const createEmployee = Joi.object({
  store_id: Joi.number().integer().required(),
  name: Joi.string().max(150).required(),
  phone: Joi.string().max(30).allow("", null),
  email: Joi.string().email().max(150).allow("", null),
  role: Joi.string().max(100).allow("", null),
  monthly_salary: Joi.number().precision(2).min(0).default(0),
  joining_date: Joi.date().iso().allow(null),
  is_active: Joi.number().valid(0, 1).default(1),
});

const updateEmployee = createEmployee.fork(["store_id", "name"], (schema) => schema.optional()).fork(["store_id"], (schema) => schema.forbidden());

const paySalary = Joi.object({
  salary_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  amount: Joi.number().precision(2).min(0.01).required(),
  payment_method: Joi.string().valid("cash", "bank", "upi", "card", "other").default("cash"),
  reference_number: Joi.string().max(100).allow("", null),
  notes: Joi.string().allow("", null),
  payment_date: Joi.date().iso().allow(null),
});

module.exports = { createEmployee, updateEmployee, paySalary };
