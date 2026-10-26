"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./discounts.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./discounts.validations");

router.use(authenticate);

// Active discounts list (for POS UI dropdown — placed before /:id)
router.get("/active", authorize("discounts", "read"), controller.getActive);

// Apply/validate a discount code (used before finalising sale)
router.post(
  "/apply",
  authorize("discounts", "read"),
  validate(schema.applyDiscount),
  controller.apply,
);

router.get("/", authorize("discounts", "read"), controller.getAll);

router.post(
  "/",
  authorize("discounts", "create"),
  validate(schema.createDiscount),
  controller.create,
);

router.get("/:id", authorize("discounts", "read"), controller.getOne);

router.patch(
  "/:id",
  authorize("discounts", "update"),
  validate(schema.updateDiscount),
  controller.update,
);

router.delete("/:id", authorize("discounts", "delete"), controller.remove);

router.patch("/:id/reset-usage", authorize("discounts", "update"), controller.resetUsage);

module.exports = router;
