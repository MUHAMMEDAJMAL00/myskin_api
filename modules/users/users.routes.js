"use strict";

const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./users.validation");

router.use(authenticate);

// ─── Users CRUD ───────────────────────────────────────────────────────────────
router.get("/", authorize("users", "read"), usersController.getAllUsers);
router.get("/:id", authorize("users", "read"), usersController.getUserById);
router.post(
  "/",
  authorize("users", "create"),
  validate(schema.createUser),
  usersController.createUser,
);
router.put(
  "/:id",
  authorize("users", "update"),
  validate(schema.updateUser),
  usersController.updateUser,
);
router.delete("/:id", authorize("users", "delete"), usersController.deleteUser);

// ─── Password Management ──────────────────────────────────────────────────────
router.put(
  "/:id/reset-password",
  authorize("users", "update"),
  validate(schema.resetPassword),
  usersController.resetPassword,
);

// ─── Store Assignments ────────────────────────────────────────────────────────
router.get(
  "/:id/stores",
  authorize("users", "read"),
  usersController.getUserStores,
);
router.post(
  "/:id/stores",
  authorize("users", "update"),
  validate(schema.assignStore),
  usersController.assignStore,
);
router.delete(
  "/:id/stores/:storeId",
  authorize("users", "update"),
  usersController.removeStore,
);

module.exports = router;
