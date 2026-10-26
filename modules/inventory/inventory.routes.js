"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./inventory.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./inventory.validation");

router.use(authenticate);

router.get("/", authorize("inventory", "read"), controller.getAll);
router.get(
  "/low-stock",
  authorize("inventory", "read"),
  controller.getLowStock,
);
router.get(
  "/movements",
  authorize("inventory", "read"),
  controller.getMovements,
);
router.get(
  "/:product_id",
  authorize("inventory", "read"),
  controller.getByProduct,
);
router.post(
  "/adjust",
  authorize("inventory", "update"),
  validate(schema.adjustStock),
  controller.adjust,
);
router.post(
  "/transfer",
  authorize("inventory", "update"),
  validate(schema.transferStock),
  controller.transfer,
);

module.exports = router;
