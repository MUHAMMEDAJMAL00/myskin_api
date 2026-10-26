const Joi = require("joi");

const createCategory = Joi.object({
  parent_id: Joi.number().integer().allow(null),
  name: Joi.string().max(100).required(),
  slug: Joi.string()
    .max(100)
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Slug can only contain lowercase letters, numbers and hyphens",
    }),
  description: Joi.string().allow("", null),
  image_url: Joi.string().allow("", null),
  sort_order: Joi.number().integer().default(0),
  is_active: Joi.number().valid(0, 1).default(1),
});

const updateCategory = Joi.object({
  parent_id: Joi.number().integer().allow(null),
  name: Joi.string().max(100),
  slug: Joi.string()
    .max(100)
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .messages({
      "string.pattern.base":
        "Slug can only contain lowercase letters, numbers and hyphens",
    }),
  description: Joi.string().allow("", null),
  image_url: Joi.string().allow("", null),
  sort_order: Joi.number().integer(),
  is_active: Joi.number().valid(0, 1),
});

module.exports = { createCategory, updateCategory };
