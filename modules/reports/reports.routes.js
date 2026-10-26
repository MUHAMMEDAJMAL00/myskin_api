"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./reports.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

router.use(authenticate);
router.use(authorize("reports", "read"));

router.get("/sales", controller.getSalesSummary);
router.get("/purchases", controller.getPurchaseSummary);
router.get("/profit-loss", controller.getProfitLoss);
router.get("/top-products", controller.getTopProducts);
router.get("/top-customers", controller.getTopCustomers);
router.get("/inventory", controller.getInventory);
router.get("/low-stock", controller.getLowStock);
router.get("/returns", controller.getReturns);
router.get("/vendors", controller.getVendors);
router.get("/daily", controller.getDaily);
router.get("/trial-balance", controller.getTrialBalance);
router.get("/balance-sheet", controller.getBalanceSheet);
router.get("/ar-aging", controller.getARaging);
router.get("/ap-aging", controller.getAPaging);
router.get("/gst-summary", controller.getGstSummary);

module.exports = router;
