"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./returns.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./returns.validation");

router.use(authenticate);

router.get("/", authorize("returns", "read"), controller.getAll);
router.post(
  "/",
  authorize("returns", "create"),
  validate(schema.createReturn),
  controller.create,
);
router.get("/:id", authorize("returns", "read"), controller.getOne);
router.patch("/:id/status", authorize("returns", "update"), controller.updateStatus);

module.exports = router;
