"use strict";

const Joi = require("joi");

const DISCOUNT_TYPES = [
  "flat", "percent", "bogo", "bulk", "min_qty",
  "spend_get", "category", "bundle", "free_item",
];
const VALUE_TYPES  = ["percent", "flat"];
const APPLY_TO     = ["all", "category", "product", "order"];
const CUST_GROUPS  = ["all", "member", "vip", "wholesale"];
const TAX_HANDLING = ["before_discount", "after_discount"];

// ─── Tier schema (used by bulk type) ──────────────────────────────────────────
const tierSchema = Joi.object({
  min_quantity:   Joi.number().min(0).required(),
  max_quantity:   Joi.number().min(0).allow(null).optional(),
  discount_type:  Joi.string().valid("flat", "percent").required(),
  discount_value: Joi.number().min(0).required(),
});

// ─── Create ───────────────────────────────────────────────────────────────────
// All Joi.when() calls are INSIDE the Joi.object() — required for Joi 17+/18.x.
// Using concat(Joi.when(...)) at the top level causes
// "Invalid reference exceeds the schema root" in Joi 18.

const createDiscount = Joi.object({
  // ── Required base fields ────────────────────────────────────────────────────
  name:          Joi.string().max(100).required(),
  discount_type: Joi.string().valid(...DISCOUNT_TYPES).required(),

  // ── Optional base fields ────────────────────────────────────────────────────
  code:        Joi.string().max(50).uppercase().allow("", null).optional(),
  description: Joi.string().max(500).allow("", null).optional(),

  discount_value_type: Joi.string().valid(...VALUE_TYPES).default("percent"),
  tax_handling: Joi.string().valid(...TAX_HANDLING).default("before_discount"),

  apply_to:    Joi.string().valid(...APPLY_TO).default("all"),
  apply_to_id: Joi.number().integer().allow(null).optional(),
  applies_to:  Joi.string().valid("order", "product").allow(null).optional(),

  customer_group:     Joi.string().valid(...CUST_GROUPS).default("all"),
  usage_limit:        Joi.number().integer().min(0).allow(null).optional(),
  per_customer_limit: Joi.number().integer().min(0).allow(null).optional(),

  start_date: Joi.date().iso().allow(null).optional(),
  end_date:   Joi.date().iso().allow(null).optional(),   // no Joi.ref — start_date may be null

  is_active: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).default(1),

  // BOGO extras
  bogo_max_times:      Joi.number().integer().min(0).default(0),
  bogo_get_product_id: Joi.number().integer().allow(null).optional(),

  // ── Conditional fields — validated inline based on discount_type ────────────

  discount_value: Joi.when("discount_type", {
    switch: [
      { is: "percent",  then: Joi.number().min(0.01).max(100).required() },
      { is: "flat",     then: Joi.number().min(0.01).required() },
      { is: "min_qty",  then: Joi.number().min(0.01).required() },
      { is: "spend_get",then: Joi.number().min(0.01).required() },
      { is: "category", then: Joi.number().min(0.01).required() },
      { is: "bundle",   then: Joi.number().min(0.01).required() },
    ],
    otherwise: Joi.number().min(0).default(0),
  }),

  min_order_amount: Joi.when("discount_type", {
    is:        Joi.valid("spend_get", "free_item"),
    then:      Joi.number().min(0.01).required(),
    otherwise: Joi.number().min(0).default(0),
  }),

  max_discount_amount: Joi.number().min(0).allow(null).optional(),

  bogo_buy_qty: Joi.when("discount_type", {
    is:        "bogo",
    then:      Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(1).default(1),
  }),

  bogo_get_qty: Joi.when("discount_type", {
    is:        "bogo",
    then:      Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(1).default(1),
  }),

  min_qty: Joi.when("discount_type", {
    is:        "min_qty",
    then:      Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(1).default(1),
  }),

  category_id: Joi.when("discount_type", {
    is:        "category",
    then:      Joi.number().integer().required(),
    otherwise: Joi.number().integer().allow(null).optional(),
  }),

  free_product_id: Joi.when("discount_type", {
    is:        "free_item",
    then:      Joi.number().integer().required(),
    otherwise: Joi.number().integer().allow(null).optional(),
  }),

  offer_product_ids: Joi.alternatives()
    .try(
      Joi.string().allow("", null),
      Joi.array().items(Joi.number().integer()),
    )
    .optional(),
  product_ids: Joi.array().items(Joi.number().integer()).optional(),

  tiers: Joi.when("discount_type", {
    is:        "bulk",
    then:      Joi.array().items(tierSchema).min(1).required(),
    otherwise: Joi.array().items(tierSchema).optional(),
  }),
});

// ─── Update — all fields optional, same conditional rules ─────────────────────
const updateDiscount = Joi.object({
  name:          Joi.string().max(100).optional(),
  discount_type: Joi.string().valid(...DISCOUNT_TYPES).optional(),

  code:        Joi.string().max(50).uppercase().allow("", null).optional(),
  description: Joi.string().max(500).allow("", null).optional(),

  discount_value_type: Joi.string().valid(...VALUE_TYPES).optional(),
  tax_handling: Joi.string().valid(...TAX_HANDLING).optional(),

  apply_to:    Joi.string().valid(...APPLY_TO).optional(),
  apply_to_id: Joi.number().integer().allow(null).optional(),
  applies_to:  Joi.string().valid("order", "product").allow(null).optional(),

  customer_group:     Joi.string().valid(...CUST_GROUPS).optional(),
  usage_limit:        Joi.number().integer().min(0).allow(null).optional(),
  per_customer_limit: Joi.number().integer().min(0).allow(null).optional(),

  start_date: Joi.date().iso().allow(null).optional(),
  end_date:   Joi.date().iso().allow(null).optional(),

  is_active: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).optional(),

  discount_value:      Joi.number().min(0).optional(),
  min_order_amount:    Joi.number().min(0).optional(),
  max_discount_amount: Joi.number().min(0).allow(null).optional(),

  bogo_buy_qty:        Joi.number().integer().min(1).optional(),
  bogo_get_qty:        Joi.number().integer().min(1).optional(),
  bogo_max_times:      Joi.number().integer().min(0).optional(),
  bogo_get_product_id: Joi.number().integer().allow(null).optional(),

  min_qty:            Joi.number().integer().min(1).optional(),
  category_id:        Joi.number().integer().allow(null).optional(),
  free_product_id:    Joi.number().integer().allow(null).optional(),

  offer_product_ids: Joi.alternatives()
    .try(
      Joi.string().allow("", null),
      Joi.array().items(Joi.number().integer()),
    )
    .optional(),
  product_ids: Joi.array().items(Joi.number().integer()).optional(),

  tiers: Joi.array().items(tierSchema).optional(),
});

// ─── Apply discount (POS validate endpoint) ───────────────────────────────────
const applyDiscount = Joi.object({
  code:        Joi.string().required(),
  cart_total:  Joi.number().min(0).required(),
  customer_id: Joi.number().integer().allow(null).optional(),
  customer_group: Joi.string().valid(...CUST_GROUPS).default("all"),
  items: Joi.array().items(
    Joi.object({
      product_id:  Joi.number().integer().required(),
      category_id: Joi.number().integer().allow(null).optional(),
      quantity:    Joi.number().min(0).required(),
      unit_price:  Joi.number().min(0).required(),
    }),
  ).min(1).required(),
});

module.exports = { createDiscount, updateDiscount, applyDiscount };
