const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const controller = require("./notifications.controller");

router.get(
  "/",
  authenticate,
  authorize("notifications", "read"),
  controller.getAll,
);
router.get(
  "/unread",
  authenticate,
  authorize("notifications", "read"),
  controller.getUnread,
);
router.patch(
  "/:id/read",
  authenticate,
  authorize("notifications", "update"),
  controller.markRead,
);
router.patch(
  "/read-all",
  authenticate,
  authorize("notifications", "update"),
  controller.markAllRead,
);
router.delete(
  "/:id",
  authenticate,
  authorize("notifications", "delete"),
  controller.remove,
);
router.post(
  "/generate",
  authenticate,
  authorize("notifications", "create"),
  controller.generate,
);

module.exports = router;
