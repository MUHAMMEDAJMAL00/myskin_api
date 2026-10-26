"use strict";
const Joi = require("joi");

const byId = Joi.number().integer().positive().required();

module.exports = { byId };
