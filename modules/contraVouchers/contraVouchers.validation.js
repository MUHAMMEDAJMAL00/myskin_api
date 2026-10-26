"use strict";
const Joi = require("joi");

const createContraVoucher = Joi.object({
  date: Joi.date().iso().required(),
  from_account_id: Joi.number().integer().required(),
  to_account_id: Joi.number().integer().required(),
  amount: Joi.number().precision(2).positive().required(),
  payment_mode: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
});

module.exports = {
  createContraVoucher,
};
