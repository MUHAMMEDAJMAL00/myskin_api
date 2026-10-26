"use strict";
const Joi = require("joi");

const lineSchema = Joi.object({
  ledger_account_id: Joi.number().integer().required(),
  debit: Joi.number().precision(2).min(0).default(0),
  credit: Joi.number().precision(2).min(0).default(0),
  description: Joi.string().max(255).allow("", null),
});

const create = Joi.object({
  name: Joi.string().max(150).required(),
  description: Joi.string().allow("", null),
  frequency: Joi.string().valid("daily", "weekly", "monthly", "yearly").default("monthly"),
  day_of_month: Joi.number().integer().min(1).max(28).when("frequency", {
    is: "monthly",
    then: Joi.required(),
    otherwise: Joi.allow(null),
  }),
  day_of_week: Joi.number().integer().min(0).max(6).when("frequency", {
    is: "weekly",
    then: Joi.required(),
    otherwise: Joi.allow(null),
  }),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref("start_date")).allow(null),
  notes: Joi.string().allow("", null),
  lines: Joi.array().items(lineSchema).min(2).required(),
});

const update = Joi.object({
  name: Joi.string().max(150),
  description: Joi.string().allow("", null),
  frequency: Joi.string().valid("daily", "weekly", "monthly", "yearly"),
  day_of_month: Joi.number().integer().min(1).max(28).allow(null),
  day_of_week: Joi.number().integer().min(0).max(6).allow(null),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().allow(null),
  notes: Joi.string().allow("", null),
  is_active: Joi.number().valid(0, 1),
  lines: Joi.array().items(lineSchema).min(2),
}).min(1);

module.exports = { create, update };
