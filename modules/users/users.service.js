"use strict";

const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Role,
  Store,
  UserStoreAssign,
} = require("../../database/index");

const env = require("../../config/env");

const SALT_ROUNDS = env.bcrypt.saltRounds;

// Admin / super_admin with an active store context sees that store's users.
// Global super_admin sees all users.
// Other roles see only their own store's users.
async function getAllUsers({ requestingUser, storeId, page = 1, limit = 20, search, is_active, role_id } = {}) {
  const where = {};

  if (storeId) {
    where.store_id = parseInt(storeId, 10);
  } else if (requestingUser.role?.toLowerCase() !== "super_admin") {
    where.store_id = requestingUser.store_id;
  }

  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active);
  if (role_id) where.role_id = parseInt(role_id);
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ["password_hash"] },
    include: [
      { model: Role, attributes: ["id", "name"] },
      { model: Store, attributes: ["id", "name"] },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / parseInt(limit)), data: rows };
}

// ─── Get User By ID ───────────────────────────────────────────────────────────
async function getUserById(id, storeId) {
  const where = { id: parseInt(id, 10) };
  if (storeId) where.store_id = parseInt(storeId, 10);
  const user = await User.findOne({
    where,
    attributes: { exclude: ["password_hash"] },
    include: [
      { model: Role, attributes: ["id", "name"] },
      { model: Store, attributes: ["id", "name"] },
    ],
  });
  return user || null;
}

// ─── Get User By Username (internal — uniqueness check) ───────────────────────
async function getUserByUsername(username, excludeId = null) {
  const where = { username };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return User.findOne({ where, attributes: ["id"] });
}

// ─── Get User By Email (internal — uniqueness check) ──────────────────────────
async function getUserByEmail(email, excludeId = null) {
  const where = { email };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return User.findOne({ where, attributes: ["id"] });
}

// ─── Create User ──────────────────────────────────────────────────────────────
async function createUser({
  name,
  username,
  email,
  password,
  phone,
  role_id,
  store_id,
}) {
  const t = await sequelize.transaction();
  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create(
      {
        name,
        username,
        email: email || null,
        password_hash,
        phone: phone || null,
        role_id,
        store_id: store_id || null,
        is_active: 1,
      },
      { transaction: t },
    );

    // Auto-create primary store assignment
    if (store_id) {
      await UserStoreAssign.create(
        { user_id: user.id, store_id, is_primary: 1 },
        { transaction: t },
      );
    }

    await t.commit();
    return getUserById(user.id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// ─── Update User ──────────────────────────────────────────────────────────────
async function updateUser(
  id,
  { name, username, email, phone, role_id, store_id, is_active },
  storeId,
) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (role_id !== undefined) updates.role_id = role_id;
  if (store_id !== undefined) updates.store_id = store_id;
  if (is_active !== undefined) updates.is_active = is_active;

  const where = { id: parseInt(id, 10) };
  if (storeId) where.store_id = parseInt(storeId, 10);
  await User.update(updates, { where });
  return getUserById(id);
}

// ─── Soft Delete User (paranoid) ──────────────────────────────────────────────
async function deleteUser(id, storeId) {
  const where = { id: parseInt(id, 10) };
  if (storeId) where.store_id = parseInt(storeId, 10);
  await sequelize.transaction(async (t) => {
    await User.update({ is_active: 0 }, { where, transaction: t });
    await User.destroy({ where, transaction: t });
  });
}

// ─── Reset Password ───────────────────────────────────────────────────────────
async function resetPassword(id, newPassword, storeId) {
  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const where = { id: parseInt(id, 10) };
  if (storeId) where.store_id = parseInt(storeId, 10);
  await User.update({ password_hash }, { where });
}

// ─── Get User Store Assignments ───────────────────────────────────────────────
async function getUserStores(userId) {
  return UserStoreAssign.findAll({
    where: { user_id: userId },
    include: [{ model: Store, attributes: ["id", "name", "code"] }],
    order: [
      ["is_primary", "DESC"],
      ["created_at", "ASC"],
    ],
  });
}

// ─── Assign Store To User ─────────────────────────────────────────────────────
async function assignStore(userId, storeId, isPrimary = false) {
  const existing = await UserStoreAssign.findOne({
    where: { user_id: userId, store_id: storeId },
  });
  if (existing) throw new Error("User is already assigned to this store.");

  // If marking as primary, unset existing primary first
  if (isPrimary) {
    await UserStoreAssign.update(
      { is_primary: 0 },
      { where: { user_id: userId } },
    );
  }

  await UserStoreAssign.create({
    user_id: userId,
    store_id: storeId,
    is_primary: isPrimary ? 1 : 0,
  });

  return getUserStores(userId);
}

// ─── Remove Store Assignment ──────────────────────────────────────────────────
async function removeStore(userId, storeId) {
  await UserStoreAssign.destroy({
    where: { user_id: userId, store_id: storeId },
  });
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getUserStores,
  assignStore,
  removeStore,
};
