const Joi = require("joi");

const openRegister = Joi.object({
  opening_balance: Joi.number().precision(2).min(0).required(),
  notes: Joi.string().allow("", null),
});

const closeRegister = Joi.object({
  closing_balance: Joi.number().precision(2).min(0).max(99999999.99).required(),
  notes: Joi.string().allow("", null),
});

const cashMovement = Joi.object({
  movement_type: Joi.string().valid("cash_in", "cash_out").required(),
  amount: Joi.number().precision(2).min(0.01).required(),
  notes: Joi.string().allow("", null),
  reference_type: Joi.string().allow("", null),
  reference_id: Joi.number().integer().allow(null),
});

const pettyCash = Joi.object({
  amount: Joi.number().precision(2).min(0.01).required(),
  description: Joi.string().max(255).allow("", null),
  notes: Joi.string().allow("", null),
});

module.exports = { openRegister, closeRegister, cashMovement, pettyCash };
