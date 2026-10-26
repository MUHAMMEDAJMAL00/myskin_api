"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./stores.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./stores.validation");

router.use(authenticate);

router.get("/", authorize("stores", "read"), controller.getAll);
router.post(
  "/",
  authorize("stores", "create"),
  validate(schema.createStore),
  controller.create,
);
router.get("/:id", authorize("stores", "read"), controller.getOne);
router.put(
  "/:id",
  authorize("stores", "update"),
  validate(schema.updateStore),
  controller.update,
);
router.delete("/:id", authorize("stores", "delete"), controller.remove);
router.get("/:id/users", authorize("stores", "read"), controller.getUsers);

module.exports = router;
