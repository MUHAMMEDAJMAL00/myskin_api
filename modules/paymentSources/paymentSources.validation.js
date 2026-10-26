"use strict";
const Joi = require("joi");

const create = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().valid("cash", "upi", "card", "bank", "other").required(),
  icon: Joi.string().max(100).allow("", null),
  is_active: Joi.boolean().default(true),
  display_order: Joi.number().integer().min(0).default(0),
  notes: Joi.string().allow("", null),
});

const update = Joi.object({
  name: Joi.string().max(100),
  type: Joi.string().valid("cash", "upi", "card", "bank", "other"),
  icon: Joi.string().max(100).allow("", null),
  is_active: Joi.boolean(),
  display_order: Joi.number().integer().min(0),
  notes: Joi.string().allow("", null),
}).min(1);

module.exports = { create, update };
