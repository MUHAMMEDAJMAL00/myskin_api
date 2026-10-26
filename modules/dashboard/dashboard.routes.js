const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const controller = require("./dashboard.controller");

router.get("/", authenticate, authorize("dashboard", "read"), controller.getSummary);
router.get("/summary", authenticate, authorize("dashboard", "read"), controller.getSummary);
router.get(
  "/low-stock",
  authenticate,
  authorize("dashboard", "read"),
  controller.getLowStock,
);
router.get(
  "/top-products",
  authenticate,
  authorize("dashboard", "read"),
  controller.getTopProducts,
);
router.get(
  "/recent-sales",
  authenticate,
  authorize("dashboard", "read"),
  controller.getRecentSales,
);

module.exports = router;
