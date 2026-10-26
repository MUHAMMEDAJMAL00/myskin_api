"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./config.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./config.validation");

router.use(authenticate);

router.get("/", authorize("config", "read"), controller.getAll);
router.get("/:key", authorize("config", "read"), controller.getOne);
router.post(
  "/",
  authorize("config", "update"),
  validate(schema.setConfig),
  controller.set,
);
router.post(
  "/bulk",
  authorize("config", "update"),
  validate(schema.bulkSetConfig),
  controller.bulkSet,
);
router.delete("/:key", authorize("config", "delete"), controller.remove);

module.exports = router;
