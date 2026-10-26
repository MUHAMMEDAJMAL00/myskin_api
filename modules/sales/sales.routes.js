"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./sales.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./sales.validation");

router.use(authenticate);

const validateId = (req, res, next) => {
  if (req.params.id && isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ success: false, message: "Invalid ID parameter" });
  }
  next();
};

router.get("/", authorize("sales", "read"), controller.getAll);
router.get("/stats", authorize("sales", "read"), controller.getStats);
router.get("/invoice/:invoice_number", authorize("sales", "read"), controller.getByInvoice);
router.post(
  "/",
  authorize("sales", "create"),
  validate(schema.createSale),
  controller.create,
);
router.get("/:id", validateId, authorize("sales", "read"), controller.getOne);
router.patch(
  "/:id/status",
  validateId,
  authorize("sales", "update"),
  validate(schema.updateSaleStatus),
  controller.updateStatus,
);

router.post(
  "/:id/payments",
  validateId,
  authorize("sales", "update"),
  validate(schema.addPayment),
  controller.addPayment,
);

module.exports = router;
