"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./vendors.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./vendors.validation");

router.use(authenticate);

router.get("/", authorize("vendors", "read"), controller.getAll);
router.post(
  "/",
  authorize("vendors", "create"),
  validate(schema.createVendor),
  controller.create,
);
router.get("/:id/purchases", authorize("vendors", "read"), controller.getPurchases);
router.get("/:id/payments", authorize("vendors", "read"), controller.getPayments);
router.get("/:id", authorize("vendors", "read"), controller.getOne);
router.put(
  "/:id",
  authorize("vendors", "update"),
  validate(schema.updateVendor),
  controller.update,
);
router.delete("/:id", authorize("vendors", "delete"), controller.remove);
router.post("/:id/recalc-balance", authorize("vendors", "update"), controller.recalcBalance);

module.exports = router;
