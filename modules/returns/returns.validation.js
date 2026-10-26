const Joi = require("joi");

const createReturn = Joi.object({
  sale_id: Joi.number().integer().required(),
  store_id: Joi.number().integer().required(),
  customer_id: Joi.number().integer().allow(null),
  return_reason: Joi.string().allow("", null),
  restocking_fee: Joi.number().precision(2).min(0).max(999999.99).default(0),
  refund_method: Joi.string()
    .valid("cash", "card", "upi", "bank", "credit", "loyalty_points")
    .required(),
  notes: Joi.string().allow("", null),
  items: Joi.array()
    .items(
      Joi.object({
        sale_item_id: Joi.number().integer().required(),
        product_id: Joi.number().integer().required(),
        variant_id: Joi.number().integer().allow(null),
        product_name: Joi.string().required(),
        quantity: Joi.number().precision(3).min(0.001).required(),
        unit_price: Joi.number().precision(2).min(0).required(),
        restock: Joi.number().valid(0, 1).default(1),
      }),
    )
    .min(1)
    .required(),
});

module.exports = { createReturn };
