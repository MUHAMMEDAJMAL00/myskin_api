"use strict";
const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./supplierPayments.validation");
const controller = require("./supplierPayments.controller");

router.get(
  "/",
  authenticate,
  authorize("supplier_payments", "read"),
  controller.getAll,
);
router.get(
  "/due",
  authenticate,
  authorize("supplier_payments", "read"),
  controller.getDueVendors,
);
router.get(
  "/vendor/:id",
  authenticate,
  authorize("supplier_payments", "read"),
  controller.getByVendor,
);
router.get(
  "/vendor/:id/purchases",
  authenticate,
  authorize("supplier_payments", "read"),
  controller.getDuePurchases,
);
router.get(
  "/vendor/:id/ledger",
  authenticate,
  authorize("supplier_payments", "read"),
  controller.getLedger,
);
router.post(
  "/",
  authenticate,
  authorize("supplier_payments", "create"),
  validate(schema.createPayment),
  controller.create,
);
router.get(
  "/:id",
  authenticate,
  authorize("supplier_payments", "read"),
  controller.getOne,
);

module.exports = router;
