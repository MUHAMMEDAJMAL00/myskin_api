"use strict";

const { Role, Permission } = require("../database/index");

const permissionCache = new Map();

async function getRolePermissions(roleId) {
  if (permissionCache.has(roleId)) {
    return permissionCache.get(roleId);
  }

  const role = await Role.findByPk(roleId, {
    include: [
      {
        model: Permission,
        through: { attributes: [] },
        attributes: ["module", "action"],
      },
    ],
  });

  const permissions = new Set(
    (role?.Permissions || []).map(
      ({ module, action }) => `${module}:${action}`,
    ),
  );

  permissionCache.set(roleId, permissions);
  return permissions;
}

function clearPermissionCache(roleId) {
  if (roleId) {
    permissionCache.delete(roleId);
  } else {
    permissionCache.clear();
  }
}

function authorize(module, action) {
  return async function (req, res, next) {
    try {
      // super_admin and admin both bypass RBAC permission checks.
      // super_admin = global access (no store filter).
      // admin       = full access within their assigned store.
      const role = req.user.role?.toLowerCase();
      if (role === "super_admin" || role === "admin") return next();

      const permissions = await getRolePermissions(req.user.role_id);
      const key = `${module}:${action}`;

      if (!permissions.has(key)) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. You don't have permission to " +
            action +
            " " +
            module +
            ".",
        });
      }

      next();
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: "Authorization error." });
    }
  };
}

module.exports = { authorize, clearPermissionCache };
