"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./quotations.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./quotations.validation");

router.use(authenticate);

router.get("/", authorize("quotations", "read"), controller.getAll);
router.post(
  "/",
  authorize("quotations", "create"),
  validate(schema.createQuotation),
  controller.create,
);
router.get("/:id", authorize("quotations", "read"), controller.getOne);
router.patch(
  "/:id",
  authorize("quotations", "update"),
  validate(schema.updateQuotation),
  controller.update,
);
router.patch(
  "/:id/status",
  authorize("quotations", "update"),
  validate(schema.updateQuotationStatus),
  controller.updateStatus,
);
router.get("/:id/versions", authorize("quotations", "read"), controller.getVersions);
router.post(
  "/:id/convert",
  authorize("quotations", "update"),
  validate(schema.convertQuotation),
  controller.convertToSale,
);

module.exports = router;
