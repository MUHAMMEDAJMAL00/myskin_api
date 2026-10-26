"use strict";

const Joi = require("joi");

const createRole = Joi.object({
  name: Joi.string().max(50).required(),
  description: Joi.string().allow("", null),
});

const updateRole = Joi.object({
  description: Joi.string().allow("", null),
});

const setRolePermissions = Joi.object({
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .required()
    .messages({
      "array.base": "permission_ids must be an array of permission IDs.",
    }),
});

module.exports = { createRole, updateRole, setRolePermissions };
