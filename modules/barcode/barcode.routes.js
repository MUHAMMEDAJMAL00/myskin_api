"use strict";
const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const controller = require("./barcode.controller");

router.get(
  "/scan/:barcode",
  authenticate,
  authorize("products", "read"),
  controller.scan,
);
router.get(
  "/sku/:sku",
  authenticate,
  authorize("products", "read"),
  controller.findBySku,
);
router.get(
  "/search",
  authenticate,
  authorize("products", "read"),
  controller.search,
);

module.exports = router;
