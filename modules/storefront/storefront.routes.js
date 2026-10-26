"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./storefront.controller");
const { authenticate } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const schema = require("./storefront.validation");

// Public storefront reads (no auth required)
router.get("/categories", controller.getCategories);
router.get("/categories/:id", controller.getCategory);
router.get("/products", controller.getProducts);
router.get("/products/:id", controller.getProduct);
router.get("/store", controller.getStoreInfo);

// Authenticated customer order endpoints
router.post("/orders", authenticate, validate(schema.placeOrder), controller.placeOrder);
router.get("/orders", authenticate, controller.getMyOrders);
router.get("/orders/:id", authenticate, controller.getMyOrderById);

// Payment
router.post("/payments/razorpay-order", authenticate, controller.createRazorpayOrder);

// Returns
router.post("/returns", authenticate, validate(schema.createReturn), controller.requestReturn);

module.exports = router;
