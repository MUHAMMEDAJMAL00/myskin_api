const Joi = require("joi");

const adjustStock = Joi.object({
  product_id: Joi.number().integer().required(),
  store_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  quantity_change: Joi.number()
    .precision(3)
    .not(0)
    .required()
    .messages({ "any.invalid": "quantity_change cannot be zero" }),
  movement_type: Joi.string()
    .valid("purchase", "sale", "adjustment", "return")
    .required(),
  notes: Joi.string().allow("", null),
  reference_type: Joi.string()
    .valid("sale", "purchase", "return", "manual")
    .allow(null),
  reference_id: Joi.number().integer().allow(null),
});

const transferStock = Joi.object({
  product_id: Joi.number().integer().required(),
  from_store_id: Joi.number().integer().required(),
  to_store_id: Joi.number().integer().required(),
  variant_id: Joi.number().integer().allow(null),
  quantity: Joi.number().precision(3).min(0.001).required(),
  notes: Joi.string().allow("", null),
});

module.exports = { adjustStock, transferStock };
