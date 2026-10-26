const Joi = require("joi");

const createUnit = Joi.object({
  name:      Joi.string().max(50).uppercase().required(),
  symbol:    Joi.string().max(10).uppercase().allow("", null),
  is_active: Joi.number().valid(0, 1).default(1),
});

const updateUnit = Joi.object({
  name:      Joi.string().max(50).uppercase(),
  symbol:    Joi.string().max(10).uppercase().allow("", null),
  is_active: Joi.number().valid(0, 1),
});

const createUomValue = Joi.object({
  value: Joi.number().precision(3).positive().required(),
});

module.exports = { createUnit, updateUnit, createUomValue };
