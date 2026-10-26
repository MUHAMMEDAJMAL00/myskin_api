"use strict";

const express = require("express");
const router = express.Router();
const rolesController = require("./roles.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./roles.validation");

router.use(authenticate);

// ─── Roles ───────────────────────────────────────────────────────────────────
router.get("/", authorize("roles", "read"), rolesController.getAllRoles);
router.post(
  "/",
  authorize("roles", "create"),
  validate(schema.createRole),
  rolesController.createRole,
);
router.delete(
  "/:id",
  authorize("roles", "delete"),
  rolesController.deleteRole,
);

// ─── Permissions Master List — must be before /:id to avoid param collision ──
router.get(
  "/permissions/all",
  authorize("roles", "read"),
  rolesController.getAllPermissions,
);

// ─── Role CRUD ────────────────────────────────────────────────────────────────
router.get("/:id", authorize("roles", "read"), rolesController.getRoleById);
router.put(
  "/:id",
  authorize("roles", "update"),
  validate(schema.updateRole),
  rolesController.updateRole,
);

// ─── Role Permissions ─────────────────────────────────────────────────────────
router.get(
  "/:id/permissions",
  authorize("roles", "read"),
  rolesController.getRolePermissions,
);
router.put(
  "/:id/permissions",
  authorize("roles", "update"),
  validate(schema.setRolePermissions),
  rolesController.setRolePermissions,
);

module.exports = router;

