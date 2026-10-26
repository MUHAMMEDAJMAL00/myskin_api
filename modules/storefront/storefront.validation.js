"use strict";

const Joi = require("joi");

const placeOrder = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        variant_id: Joi.number().integer().allow(null),
        quantity: Joi.number().precision(3).min(0.001).required(),
        unit_price: Joi.number().precision(2).min(0).required(),
        tax_rate: Joi.number().precision(2).min(0).max(100).default(0),
        tax_included: Joi.number().valid(0, 1).default(0),
        discount_type: Joi.string().valid("none", "flat", "percent").default("none"),
        discount_value: Joi.number().precision(2).min(0).default(0),
      }),
    )
    .min(1)
    .required(),
  shipping_address: Joi.object({
    name: Joi.string().allow("", null),
    phone: Joi.string().allow("", null),
    address: Joi.string().allow("", null),
    city: Joi.string().allow("", null),
    state: Joi.string().allow("", null),
    postal_code: Joi.string().allow("", null),
    country: Joi.string().allow("", null).default("India"),
  }).optional(),
  payment_method: Joi.string()
    .valid("cash", "card", "upi", "bank", "credit", "online", "cod", "bank_transfer")
    .default("cod"),
  razorpay_payment_id: Joi.string().allow("", null),
  razorpay_order_id: Joi.string().allow("", null),
  razorpay_signature: Joi.string().allow("", null),
  subtotal: Joi.number().precision(2).min(0).default(0),
  discount_total: Joi.number().precision(2).min(0).default(0),
  tax_total: Joi.number().precision(2).min(0).default(0),
  delivery_charges: Joi.number().precision(2).min(0).default(0),
  total_price: Joi.number().precision(2).min(0).default(0),
  notes: Joi.string().allow("", null),
});

const createReturn = Joi.object({
  order_id: Joi.number().integer().required(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().precision(3).min(0.001).required(),
        reason: Joi.string().max(500).allow("", null),
      }),
    )
    .min(1)
    .required(),
  notes: Joi.string().allow("", null).max(1000),
});

module.exports = { placeOrder, createReturn };
