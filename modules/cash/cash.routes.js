"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./cash.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./cash.validation");

router.use(authenticate);

router.get("/", authorize("config", "read"), controller.getAll);
router.get("/active", authorize("config", "read"), controller.getActive);
router.get("/daily", authorize("config", "read"), controller.dailySummary);
router.get("/suggested-opening", authorize("config", "read"), controller.suggestedOpening);
router.get("/shift-summary", controller.shiftSummary);
router.get("/:id", authorize("config", "read"), controller.getOne);
router.post(
  "/open",
  authorize("config", "update"),
  validate(schema.openRegister),
  controller.open,
);
router.post(
  "/:id/close",
  authorize("config", "update"),
  validate(schema.closeRegister),
  controller.close,
);
router.post(
  "/:id/movement",
  authorize("config", "update"),
  validate(schema.cashMovement),
  controller.movement,
);
router.post(
  "/:id/petty-cash",
  authorize("config", "update"),
  validate(schema.pettyCash),
  controller.pettyCash,
);

module.exports = router;
