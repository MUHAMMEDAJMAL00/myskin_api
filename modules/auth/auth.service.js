"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  User,
  Role,
  Permission,
  Store,
  UserStoreAssign,
  RefreshToken,
} = require("../../database/index");
const env = require("../../config/env");
const notifSvc = require("../notifications/notifications.service");

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// ─── Find User By Username Or Email ──────────────────────────────────────────
async function findUserByUsername(username) {
  const { Op } = require("sequelize");
  return User.findOne({
    where: { [Op.or]: [{ username }, { email: username }] },
    include: [{ model: Role, attributes: ["id", "name"] }],
  });
}

// ─── Get User Permissions ─────────────────────────────────────────────────────
async function getUserPermissions(roleId) {
  const role = await Role.findByPk(roleId, {
    include: [
      {
        model: Permission,
        through: { attributes: [] },
        attributes: ["module", "action"],
      },
    ],
  });

  const permissions = {};
  if (role && role.Permissions) {
    role.Permissions.forEach(({ module, action }) => {
      permissions[`${module}:${action}`] = true;
    });
  }
  return permissions;
}

// ─── Get User Stores ──────────────────────────────────────────────────────────
async function getUserStores(userId) {
  const assignments = await UserStoreAssign.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Store,
        where: { is_active: 1 },
        attributes: ["id", "name", "code", "currency", "allow_negative_stock"],
      },
    ],
    order: [["is_primary", "DESC"]],
  });

  return assignments.filter((a) => a.Store).map((a) => ({
    id: a.Store.id,
    name: a.Store.name,
    code: a.Store.code,
    currency: a.Store.currency,
    allow_negative_stock: a.Store.allow_negative_stock,
    is_primary: a.is_primary,
  }));
}

// ─── Update Last Login ────────────────────────────────────────────────────────
async function updateLastLogin(userId) {
  await User.update({ last_login: new Date() }, { where: { id: userId } });
}

// ─── Generate JWT Token ───────────────────────────────────────────────────────
function generateToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function login(username, password) {
  const user = await findUserByUsername(username);
  if (!user) throw { status: 401, message: "Invalid username or password" };

  if (!user.is_active)
    throw {
      status: 403,
      message: "Your account has been deactivated. Contact admin.",
    };

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw { status: 401, message: "Invalid username or password" };

  const [permissions, stores] = await Promise.all([
    getUserPermissions(user.role_id),
    getUserStores(user.id),
  ]);

  const isSuperAdmin = user.Role.name?.toLowerCase() === "super_admin";
  const primaryStore = stores.find((s) => s.is_primary) || stores[0] || null;
  const primaryStoreId = !isSuperAdmin && primaryStore ? primaryStore.id : null;

  const token = generateToken({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.Role.name,
    role_id: user.role_id,
    store_id: primaryStoreId,
    allow_negative_stock: primaryStore ? primaryStore.allow_negative_stock : 0,
  });

  await updateLastLogin(user.id);

  const refresh_token = await issueRefreshToken(user.id);

  // Fire-and-forget: generate stock/payment alerts for the user's primary store
  if (primaryStoreId) {
    notifSvc.generateAlerts(primaryStoreId, user.id).catch((err) => console.warn("[Auth] Alert generation failed:", err));
  }

  return {
    token,
    refresh_token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.Role.name,
      role_id: user.role_id,
      store_id: isSuperAdmin ? null : primaryStoreId,
      allow_negative_stock: primaryStore ? primaryStore.allow_negative_stock : 0,
      last_login: user.last_login,
      permissions,
      stores,
    },
  };
}

// ─── Get Me ───────────────────────────────────────────────────────────────────
async function getMe(userId) {
  const user = await User.findOne({
    where: { id: userId, is_active: 1 },
    attributes: { exclude: ["password_hash"] },
    include: [{ model: Role, attributes: ["id", "name"] }],
  });
  if (!user) throw { status: 404, message: "User not found" };

  const [permissions, stores] = await Promise.all([
    getUserPermissions(user.role_id),
    getUserStores(user.id),
  ]);

  const isSuperAdmin = user.Role.name?.toLowerCase() === "super_admin";
  const primaryStore = stores.find((s) => s.is_primary) || stores[0] || null;
  const primaryStoreId = !isSuperAdmin && primaryStore ? primaryStore.id : null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    store_id: primaryStoreId,
    last_login: user.last_login,
    created_at: user.created_at,
    role: user.Role.name,
    role_id: user.role_id,
    permissions,
    stores,
  };
}

// ─── Change Password ──────────────────────────────────────────────────────────
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findOne({
    where: { id: userId, is_active: 1 },
    attributes: ["id", "password_hash"],
  });
  if (!user) throw { status: 404, message: "User not found" };

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw { status: 400, message: "Current password is incorrect" };

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await User.update({ password_hash: newHash }, { where: { id: userId } });

  return { message: "Password changed successfully" };
}

// ─── Refresh Token Rotation ───────────────────────────────────────────────────
function _hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function issueRefreshToken(userId, t = null) {
  const raw = crypto.randomBytes(48).toString("hex");
  const hash = _hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86400_000);
  const opts = t ? { transaction: t } : {};
  await RefreshToken.create({ user_id: userId, token_hash: hash, expires_at: expiresAt }, opts);
  return raw;
}

async function refreshToken(rawToken) {
  if (!rawToken) throw { status: 401, message: "Refresh token required" };

  const hash = _hashToken(rawToken);
  const record = await RefreshToken.findOne({ where: { token_hash: hash } });

  if (!record) throw { status: 401, message: "Invalid refresh token" };

  if (record.used_at) {
    // Reuse detected — revoke all tokens for this user
    await RefreshToken.destroy({ where: { user_id: record.user_id } });
    throw { status: 401, message: "Refresh token reuse detected. Please log in again." };
  }

  if (new Date() > new Date(record.expires_at)) {
    await record.destroy();
    throw { status: 401, message: "Refresh token expired" };
  }

  // Fetch user — do this before marking token used
  const user = await User.findOne({
    where: { id: record.user_id, is_active: 1 },
    include: [{ model: Role, attributes: ["id", "name"] }],
  });
  if (!user) throw { status: 401, message: "User not found or inactive" };

  const [permissions, stores] = await Promise.all([
    getUserPermissions(user.role_id),
    getUserStores(user.id),
  ]);

  const isSuperAdmin = user.Role.name?.toLowerCase() === "super_admin";
  const primaryStore = stores.find((s) => s.is_primary) || stores[0] || null;
  const primaryStoreId = !isSuperAdmin && primaryStore ? primaryStore.id : null;

  const accessToken = generateToken({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.Role.name,
    role_id: user.role_id,
    store_id: primaryStoreId,
  });

  const [newRawRefreshToken] = await sequelize.transaction(async (t) => {
    const token = await issueRefreshToken(user.id, t);
    await record.update({ used_at: new Date() }, { transaction: t });
    return [token];
  });

  return { token: accessToken, refresh_token: newRawRefreshToken };
}

module.exports = { login, getMe, changePassword, refreshToken, issueRefreshToken };
