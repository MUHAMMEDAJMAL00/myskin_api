"use strict";

const Joi = require("joi");

const createUser = Joi.object({
  name: Joi.string().max(100).required(),
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().max(100).allow("", null),
  password: Joi.string().min(6).max(100).required(),
  phone: Joi.string().max(20).allow("", null),
  role_id: Joi.number().integer().positive().required(),
  store_id: Joi.number().integer().positive().allow(null),
});

const updateUser = Joi.object({
  name: Joi.string().max(100),
  username: Joi.string().alphanum().min(3).max(50),
  email: Joi.string().email().max(100).allow("", null),
  phone: Joi.string().max(20).allow("", null),
  role_id: Joi.number().integer().positive(),
  store_id: Joi.number().integer().positive().allow(null),
  is_active: Joi.number().valid(0, 1),
});

const resetPassword = Joi.object({
  new_password: Joi.string().min(6).max(100).required(),
});

const assignStore = Joi.object({
  store_id: Joi.number().integer().positive().required(),
  is_primary: Joi.boolean().default(false),
});

module.exports = { createUser, updateUser, resetPassword, assignStore };
