const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const controller = require("./auditLog.controller");

router.get(
  "/",
  authenticate,
  authorize("audit_log", "read"),
  controller.getAll,
);
router.get(
  "/modules",
  authenticate,
  authorize("audit_log", "read"),
  controller.getModules,
);
router.get(
  "/:id",
  authenticate,
  authorize("audit_log", "read"),
  controller.getOne,
);

module.exports = router;
