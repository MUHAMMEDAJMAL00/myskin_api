"use strict";
const Joi = require("joi");

const componentSchema = Joi.object({
  name: Joi.string().max(50).required(),
  rate: Joi.number().precision(2).min(0).max(100).required(),
});

const createTaxGroup = Joi.object({
  name: Joi.string().max(100).required(),
  category: Joi.string().valid("GST", "VAT", "Custom").default("GST"),
  description: Joi.string().max(255).allow("", null),
  tax_type: Joi.string().valid("inclusive", "exclusive").default("exclusive"),
  rate: Joi.number().precision(2).min(0).max(100).required(),
  components: Joi.array().items(componentSchema).allow(null),
  is_inter_state: Joi.number().valid(0, 1).default(0),
  is_active: Joi.number().valid(0, 1).default(1),
});

const updateTaxGroup = Joi.object({
  name: Joi.string().max(100),
  category: Joi.string().valid("GST", "VAT", "Custom"),
  description: Joi.string().max(255).allow("", null),
  tax_type: Joi.string().valid("inclusive", "exclusive"),
  rate: Joi.number().precision(2).min(0).max(100),
  components: Joi.array().items(componentSchema).allow(null),
  is_inter_state: Joi.number().valid(0, 1),
  is_active: Joi.number().valid(0, 1),
});

module.exports = { createTaxGroup, updateTaxGroup };
