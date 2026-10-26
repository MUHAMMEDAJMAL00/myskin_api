"use strict";

const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const ctrl = require("./cart.controller");

router.get("/", authenticate, ctrl.getCart);
router.post("/", authenticate, ctrl.addToCart);
router.put("/:id", authenticate, ctrl.updateCartItem);
router.delete("/:id", authenticate, ctrl.removeCartItem);
router.delete("/", authenticate, ctrl.clearCart);

module.exports = router;
