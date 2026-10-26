"use strict";
const Joi = require("joi");

const lineSchema = Joi.object({
  ledger_account_id: Joi.number().integer().required(),
  debit: Joi.number().precision(2).min(0).default(0),
  credit: Joi.number().precision(2).min(0).default(0),
  description: Joi.string().allow("", null),
});

const createJournalEntry = Joi.object({
  date: Joi.date().iso().required(),
  description: Joi.string().allow("", null),
  lines: Joi.array().items(lineSchema).min(2).required(),
});

module.exports = {
  createJournalEntry,
};
