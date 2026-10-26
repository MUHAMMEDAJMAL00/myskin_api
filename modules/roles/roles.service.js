"use strict";

const {
  sequelize,
  Role,
  Permission,
  RolePermission,
} = require("../../database/index");

// ─── Create Role ───────────────────────────────────────────────────────────────
async function createRole({ name, description }) {
  const existing = await Role.findOne({ where: { name }, raw: true });
  if (existing) {
    const err = new Error("Role with this name already exists");
    err.status = 409;
    throw err;
  }
  const role = await Role.create({ name, description: description || null });
  return getRoleById(role.id);
}

// ─── Delete Role ───────────────────────────────────────────────────────────────
async function deleteRole(id) {
  const role = await Role.findByPk(id);
  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }
  await RolePermission.destroy({ where: { role_id: id } });
  await role.destroy();
  return { message: "Role deleted" };
}

// ─── Get All Roles ────────────────────────────────────────────────────────────
async function getAllRoles() {
  return Role.findAll({
    attributes: ["id", "name", "description", "created_at"],
    order: [["id", "ASC"]],
    raw: true,
  });
}

// ─── Get Role By ID ───────────────────────────────────────────────────────────
async function getRoleById(id) {
  const role = await Role.findByPk(id, {
    attributes: ["id", "name", "description", "created_at"],
    raw: true,
  });
  return role || null;
}

// ─── Update Role Description ──────────────────────────────────────────────────
// Role names are fixed — only description is editable
async function updateRole(id, { description }) {
  await Role.update({ description }, { where: { id } });
  return getRoleById(id);
}

// ─── Get Permissions For a Role ───────────────────────────────────────────────
async function getRolePermissions(roleId) {
  const role = await Role.findByPk(roleId, {
    include: [
      {
        model: Permission,
        through: { attributes: [] },
        attributes: ["id", "module", "action", "description"],
      },
    ],
  });
  if (!role) return [];
  return role.Permissions;
}

// ─── Set Permissions For a Role (replace all) ─────────────────────────────────
async function setRolePermissions(roleId, permissionIds) {
  const t = await sequelize.transaction();
  try {
    await RolePermission.destroy({
      where: { role_id: roleId },
      transaction: t,
    });

    if (permissionIds && permissionIds.length > 0) {
      const rows = permissionIds.map((permission_id) => ({
        role_id: roleId,
        permission_id,
      }));
      await RolePermission.bulkCreate(rows, { transaction: t });
    }

    await t.commit();
    return getRolePermissions(roleId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// ─── Get All Permissions (master list) ────────────────────────────────────────
async function getAllPermissions() {
  return Permission.findAll({
    attributes: ["id", "module", "action", "description"],
    order: [
      ["module", "ASC"],
      ["action", "ASC"],
    ],
    raw: true,
  });
}

// ─── Seed Permissions (idempotent) ────────────────────────────────────────────
async function seedPermissions() {
  const fs = require("fs");
  const path = require("path");
  const modulesDir = path.resolve(__dirname, "../../modules");
  const dirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of dirs) {
    const routesFile = path.join(modulesDir, dir, dir + ".routes.js");
    if (!fs.existsSync(routesFile)) continue;
    const content = fs.readFileSync(routesFile, "utf-8");
    const regex = /authorize\("([^"]+)",\s*"([^"]+)"\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const module = match[1];
      const action = match[2];
      await Permission.findOrCreate({
        where: { module, action },
        defaults: { description: `Can ${action} ${module}` },
      });
    }
  }

  return getAllPermissions();
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
  seedPermissions,
};
