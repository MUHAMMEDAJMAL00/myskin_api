"use strict";

const rolesService = require("./roles.service");
const { clearPermissionCache } = require("../../middleware/rbac");
const AppError = require("../../utils/AppError");

// ─── Helper: check if caller can access/modify the target role ────────────────
async function guardRole(req, roleId) {
  const target = await rolesService.getRoleById(roleId);
  if (!target) throw new AppError("Role not found", 404);
  const callerRole = req.user.role?.toLowerCase();
  if (callerRole === "super_admin") return target;
  if (target.name === "super_admin")
    throw new AppError("Access denied", 403);
  return target;
}

// ─── Create Role ───────────────────────────────────────────────────────────────
async function createRole(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name) throw new AppError("Role name is required", 400);
    const role = await rolesService.createRole({ name, description });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
}

// ─── Delete Role ───────────────────────────────────────────────────────────────
async function deleteRole(req, res, next) {
  try {
    const target = await guardRole(req, req.params.id);
    if (target.name === "admin" && req.user.role?.toLowerCase() !== "super_admin")
      throw new AppError("Cannot delete the admin role", 403);
    const result = await rolesService.deleteRole(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ─── Get All Roles ────────────────────────────────────────────────────────────
async function getAllRoles(req, res, next) {
  try {
    const roles = await rolesService.getAllRoles();
    const filtered = req.user.role?.toLowerCase() === "super_admin"
      ? roles
      : roles.filter((r) => r.name !== "super_admin");
    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
}

// ─── Get Role By ID ───────────────────────────────────────────────────────────
async function getRoleById(req, res, next) {
  try {
    const target = await guardRole(req, req.params.id);
    res.json({ success: true, data: target });
  } catch (err) {
    next(err);
  }
}

// ─── Update Role ──────────────────────────────────────────────────────────────
async function updateRole(req, res, next) {
  try {
    const target = await guardRole(req, req.params.id);
    if (target.name === "admin" && req.user.role?.toLowerCase() !== "super_admin")
      throw new AppError("Cannot modify the admin role", 403);
    const role = await rolesService.updateRole(req.params.id, req.body);
    res.json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
}

// ─── Get Role Permissions ─────────────────────────────────────────────────────
async function getRolePermissions(req, res, next) {
  try {
    const target = await guardRole(req, req.params.id);
    const permissions = await rolesService.getRolePermissions(req.params.id);
    res.json({ success: true, data: permissions });
  } catch (err) {
    next(err);
  }
}

// ─── Set Role Permissions ─────────────────────────────────────────────────────
async function setRolePermissions(req, res, next) {
  try {
    const target = await guardRole(req, req.params.id);
    if (target.name === "admin" && req.user.role?.toLowerCase() !== "super_admin")
      throw new AppError("Cannot modify permissions for the admin role", 403);

    const roleId = parseInt(req.params.id, 10);
    const { permission_ids } = req.body;

    const permissions = await rolesService.setRolePermissions(roleId, permission_ids);

    clearPermissionCache(roleId);

    res.json({ success: true, message: "Role permissions updated.", data: permissions });
  } catch (err) {
    next(err);
  }
}

// ─── Get All Permissions ──────────────────────────────────────────────────────
async function getAllPermissions(req, res, next) {
  try {
    const permissions = await rolesService.getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  updateRole,
  getRolePermissions,
  setRolePermissions,
  getAllPermissions,
};
