"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./gst.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

router.use(authenticate);

router.get(
  "/sale/:sale_id",
  authorize("reports", "read"),
  controller.getSaleGST,
);
router.get("/gstr1", authorize("reports", "read"), controller.getGSTR1);
router.get("/summary", authorize("reports", "read"), controller.getSummary);
router.get(
  "/invoice/:sale_id/pdf",
  authorize("sales", "read"),
  controller.printInvoice,
);
router.get(
  "/receipt/:sale_id/pdf",
  authorize("sales", "read"),
  controller.printReceipt,
);

module.exports = router;
