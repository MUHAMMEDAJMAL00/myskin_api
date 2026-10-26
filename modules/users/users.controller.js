"use strict";

const usersService = require("./users.service");
const { Role } = require("../../database/index");
const auditLog = require("../auditLog/auditLog.service");

// ─── GET /api/users ───────────────────────────────────────────────────────────
async function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, search, is_active, role_id } = req.query;
    const result = await usersService.getAllUsers({ requestingUser: req.user, storeId: req.storeId, page, limit, search, is_active, role_id });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id, req.storeId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────
async function createUser(req, res, next) {
  try {
    let { name, username, email, password, phone, role_id, store_id } = req.body;

    if (!req.isSuperAdmin) {
      if (!store_id) store_id = req.storeId;
      if (!store_id || parseInt(store_id) !== req.storeId) {
        return res.status(403).json({ success: false, message: "You can only create users for your own store." });
      }
      const privilegedRole = await Role.findOne({
        where: { id: role_id, name: ["admin", "super_admin"] },
        attributes: ["id"],
      });
      if (privilegedRole) {
        return res.status(403).json({ success: false, message: "You cannot assign the admin or super_admin role." });
      }
    }

    const existingUsername = await usersService.getUserByUsername(username);
    if (existingUsername)
      return res.status(409).json({ success: false, message: "Username already taken." });

    if (email) {
      const existingEmail = await usersService.getUserByEmail(email);
      if (existingEmail)
        return res.status(409).json({ success: false, message: "Email already in use." });
    }

    const user = await usersService.createUser({ name, username, email, password, phone, role_id, store_id });
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "users", action: "create", reference_type: "user", reference_id: user.id, new_values: { name, username, email, role_id, store_id }, ip_address: req.ip });
    return res.status(201).json({ success: true, message: "User created successfully.", data: user });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
async function updateUser(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!req.isSuperAdmin) {
      if (user.store_id !== req.storeId)
        return res.status(403).json({ success: false, message: "Access denied." });
      const targetRole = user.Role?.name?.toLowerCase();
      if (targetRole === "admin" || targetRole === "super_admin")
        return res.status(403).json({ success: false, message: "You cannot edit admin accounts." });
      if (req.body.role_id) {
        const privilegedRole = await Role.findOne({
          where: { id: req.body.role_id, name: ["admin", "super_admin"] },
          attributes: ["id"],
        });
        if (privilegedRole)
          return res.status(403).json({ success: false, message: "You cannot assign the admin or super_admin role." });
      }
    }

    if (req.body.username) {
      const existingUsername = await usersService.getUserByUsername(req.body.username, req.params.id);
      if (existingUsername)
        return res.status(409).json({ success: false, message: "Username already taken." });
    }

    if (req.body.email) {
      const existingEmail = await usersService.getUserByEmail(req.body.email, req.params.id);
      if (existingEmail)
        return res.status(409).json({ success: false, message: "Email already in use." });
    }

    const { name, username, email, phone, role_id, store_id, is_active } = req.body;
    const updated = await usersService.updateUser(req.params.id, { name, username, email, phone, role_id, store_id, is_active }, req.storeId);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "users", action: "update", reference_type: "user", reference_id: parseInt(req.params.id), old_values: { name: user.name, username: user.username, email: user.email, role_id: user.role_id, is_active: user.is_active }, new_values: { name, username, email, phone, role_id, store_id, is_active }, ip_address: req.ip });
    return res.status(200).json({ success: true, message: "User updated.", data: updated });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
async function deleteUser(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });

    if (!req.isSuperAdmin) {
      if (user.store_id !== req.storeId)
        return res.status(403).json({ success: false, message: "Access denied." });
      if (user.Role?.name !== "cashier")
        return res.status(403).json({ success: false, message: "You can only deactivate cashier accounts." });
    }

    await usersService.deleteUser(req.params.id, req.storeId);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "users", action: "delete", reference_type: "user", reference_id: parseInt(req.params.id), old_values: { name: user.name, username: user.username }, ip_address: req.ip });
    return res.status(200).json({ success: true, message: "User deactivated successfully." });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/users/:id/reset-password ───────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ success: false, message: "new_password must be at least 6 characters." });

    const user = await usersService.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!req.isSuperAdmin) {
      if (user.store_id !== req.storeId || user.Role?.name !== "cashier")
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    await usersService.resetPassword(req.params.id, new_password, req.storeId);
    return res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/users/:id/stores ────────────────────────────────────────────────
async function getUserStores(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });
    const stores = await usersService.getUserStores(req.params.id);
    return res.status(200).json({ success: true, data: stores });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/users/:id/stores ───────────────────────────────────────────────
async function assignStore(req, res, next) {
  try {
    const { store_id, is_primary } = req.body;
    if (!store_id)
      return res.status(400).json({ success: false, message: "store_id is required." });

    const user = await usersService.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    const stores = await usersService.assignStore(req.params.id, store_id, is_primary || false);
    return res.status(201).json({ success: true, message: "Store assigned.", data: stores });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/users/:id/stores/:storeId ────────────────────────────────────
async function removeStore(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });
    await usersService.removeStore(req.params.id, req.params.storeId);
    return res.status(200).json({ success: true, message: "Store assignment removed." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getUserStores,
  assignStore,
  removeStore,
};
