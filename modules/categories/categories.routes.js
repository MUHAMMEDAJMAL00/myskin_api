"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./categories.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./categories.validation");

router.use(authenticate);

router.post("/upload-image", authorize("categories", "create"), controller.uploadImage);
router.get("/", authorize("categories", "read"), controller.getAll);
router.post(
  "/",
  authorize("categories", "create"),
  validate(schema.createCategory),
  controller.create,
);
router.get("/:id", authorize("categories", "read"), controller.getOne);
router.put(
  "/:id",
  authorize("categories", "update"),
  validate(schema.updateCategory),
  controller.update,
);
router.delete("/:id", authorize("categories", "delete"), controller.remove);

module.exports = router;
