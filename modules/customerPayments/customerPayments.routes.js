const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./customerPayments.validations");
const controller = require("./customerPayments.controller");

router.get(
  "/",
  authenticate,
  authorize("customer_payments", "read"),
  controller.getAll,
);
router.get(
  "/due",
  authenticate,
  authorize("customer_payments", "read"),
  controller.getDueCustomers,
);
router.get(
  "/customer/:id",
  authenticate,
  authorize("customer_payments", "read"),
  controller.getByCustomer,
);
router.get(
  "/customer/:id/sales",
  authenticate,
  authorize("customer_payments", "read"),
  controller.getDueSales,
);
router.get(
  "/customer/:id/ledger",
  authenticate,
  authorize("customer_payments", "read"),
  controller.getLedger,
);
router.post(
  "/",
  authenticate,
  authorize("customer_payments", "create"),
  validate(schema.createPayment),
  controller.create,
);
router.get(
  "/:id",
  authenticate,
  authorize("customer_payments", "read"),
  controller.getOne,
);

module.exports = router;
