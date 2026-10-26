"use strict";

const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const ctrl = require("./wishlist.controller");

router.get("/", authenticate, ctrl.getWishlist);
router.post("/", authenticate, ctrl.addToWishlist);
router.delete("/:id", authenticate, ctrl.removeWishlistItem);
router.delete("/", authenticate, ctrl.clearWishlist);

module.exports = router;
