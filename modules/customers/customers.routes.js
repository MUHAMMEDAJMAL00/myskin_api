"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./customers.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./customers.validation");

router.use(authenticate);

router.get("/search", authorize("customers", "read"), controller.searchByPhone);
router.get("/", authorize("customers", "read"), controller.getAll);
router.get(
  "/:id/loyalty",
  authorize("customers", "read"),
  controller.getLoyaltyHistory,
);
router.post(
  "/",
  authorize("customers", "create"),
  validate(schema.createCustomer),
  controller.create,
);
router.get("/:id", authorize("customers", "read"), controller.getOne);
router.put(
  "/:id",
  authorize("customers", "update"),
  validate(schema.updateCustomer),
  controller.update,
);
router.delete("/:id", authorize("customers", "delete"), controller.remove);
router.post("/:id/recalc-balance", authorize("customers", "update"), controller.recalcBalance);
router.patch(
  "/:id/loyalty",
  authorize("customers", "update"),
  controller.updateLoyalty,
);

module.exports = router;
