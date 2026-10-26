const Joi = require("joi");

const createPurchase = Joi.object({
  store_id: Joi.number().integer().required(),
  vendor_id: Joi.number().integer().required(),
  purchase_date: Joi.date()
    .iso()
    .default(() => new Date()),
  status: Joi.string()
    .valid("received", "pending", "cancelled")
    .default("received"),
  reference_number: Joi.string().max(100).allow("", null),
  shipping_charge: Joi.number().precision(2).min(0).default(0),
  notes: Joi.string().allow("", null),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        variant_id: Joi.number().integer().allow(null),
        quantity: Joi.number().precision(3).min(0.001).required(),
        unit_cost: Joi.number().precision(2).min(0).required(),
        discount_amount: Joi.number().precision(2).min(0).default(0),
        tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
      }),
    )
    .min(1)
    .required(),
  payments: Joi.array()
    .items(
      Joi.object({
        payment_method: Joi.string()
          .valid("cash", "card", "upi", "bank", "credit")
          .required(),
        amount: Joi.number().precision(2).min(0.01).required(),
        reference_number: Joi.string().allow("", null),
        notes: Joi.string().allow("", null),
      }),
    )
    .default([]),
});

const updatePurchaseStatus = Joi.object({
  status: Joi.string().valid("received", "pending", "cancelled").required(),
  payment_status: Joi.string().valid("unpaid", "partial", "paid"),
});

const addPayment = Joi.object({
  payment_method: Joi.string()
    .valid("cash", "card", "upi", "bank", "credit")
    .required(),
  amount: Joi.number().precision(2).min(0.01).required(),
  reference_number: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
  payment_date: Joi.date().iso().allow(null),
});

module.exports = { createPurchase, updatePurchaseStatus, addPayment };
