"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./purchases.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./purchases.validation");

router.use(authenticate);

router.get("/", authorize("purchases", "read"), controller.getAll);
router.post(
  "/",
  authorize("purchases", "create"),
  validate(schema.createPurchase),
  controller.create,
);
router.get("/:id", authorize("purchases", "read"), controller.getOne);
router.get("/:id/items", authorize("purchases", "read"), controller.getItems);
router.patch(
  "/:id/status",
  authorize("purchases", "update"),
  validate(schema.updatePurchaseStatus),
  controller.updateStatus,
);

router.post(
  "/:id/payments",
  authorize("purchases", "update"),
  validate(schema.addPayment),
  controller.addPayment,
);

module.exports = router;
