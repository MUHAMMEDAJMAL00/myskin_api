"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Customer, CustomerRefreshToken, Store } = require("../../database/index");
const env = require("../../config/env");

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function _hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

async function getDefaultStore() {
  const store = await Store.findOne({ where: { is_active: 1 }, order: [["id", "ASC"]] });
  return store ? store.id : null;
}

// ─── Signup ────────────────────────────────────────────────────────────────────

async function signup({ name, email, phone, password }) {
  const existing = await Customer.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, message: "An account with this email already exists" };
  }

  if (phone) {
    const phoneExisting = await Customer.findOne({ where: { phone } });
    if (phoneExisting) {
      throw { status: 409, message: "An account with this phone number already exists" };
    }
  }

  const storeId = await getDefaultStore();
  const passwordHash = await bcrypt.hash(password, env.bcrypt.saltRounds);

  const customer = await Customer.create({
    store_id: storeId,
    name,
    email,
    phone: phone || null,
    password_hash: passwordHash,
  });

  const token = generateToken({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    role: "customer",
  });

  const refreshToken = await issueRefreshToken(customer.id);

  return {
    token,
    refresh_token: refreshToken,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  };
}

// ─── Login ─────────────────────────────────────────────────────────────────────

async function login(email, password) {
  const customer = await Customer.findOne({ where: { email, is_active: 1 } });
  if (!customer) {
    throw { status: 401, message: "Invalid email or password" };
  }

  if (!customer.password_hash) {
    throw { status: 401, message: "This account does not have a password set. Please use another login method." };
  }

  const isMatch = await bcrypt.compare(password, customer.password_hash);
  if (!isMatch) {
    throw { status: 401, message: "Invalid email or password" };
  }

  const token = generateToken({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    role: "customer",
  });

  const refreshToken = await issueRefreshToken(customer.id);

  return {
    token,
    refresh_token: refreshToken,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  };
}

// ─── Get Me ────────────────────────────────────────────────────────────────────

async function getMe(customerId) {
  const customer = await Customer.findOne({
    where: { id: customerId, is_active: 1 },
    attributes: { exclude: ["password_hash"] },
  });
  if (!customer) {
    throw { status: 404, message: "Customer not found" };
  }
  return customer;
}

// ─── Update Profile ────────────────────────────────────────────────────────────

async function updateProfile(customerId, data) {
  const customer = await Customer.findOne({ where: { id: customerId, is_active: 1 } });
  if (!customer) {
    throw { status: 404, message: "Customer not found" };
  }

  if (data.email && data.email !== customer.email) {
    const existing = await Customer.findOne({ where: { email: data.email } });
    if (existing) {
      throw { status: 409, message: "Email already in use" };
    }
  }

  if (data.phone && data.phone !== customer.phone) {
    const existing = await Customer.findOne({ where: { phone: data.phone } });
    if (existing) {
      throw { status: 409, message: "Phone number already in use" };
    }
  }

  await customer.update(data);
  return Customer.findByPk(customerId, { attributes: { exclude: ["password_hash"] } });
}

// ─── Change Password ───────────────────────────────────────────────────────────

async function changePassword(customerId, currentPassword, newPassword) {
  const customer = await Customer.findOne({
    where: { id: customerId, is_active: 1 },
    attributes: ["id", "password_hash"],
  });
  if (!customer) {
    throw { status: 404, message: "Customer not found" };
  }

  if (!customer.password_hash) {
    throw { status: 400, message: "No password is set on this account" };
  }

  const isMatch = await bcrypt.compare(currentPassword, customer.password_hash);
  if (!isMatch) {
    throw { status: 400, message: "Current password is incorrect" };
  }

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await Customer.update({ password_hash: newHash }, { where: { id: customerId } });

  return { message: "Password changed successfully" };
}

// ─── Refresh Token Rotation ────────────────────────────────────────────────────

async function issueRefreshToken(customerId, t = null) {
  const raw = crypto.randomBytes(48).toString("hex");
  const hash = _hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86400_000);
  const opts = t ? { transaction: t } : {};
  await CustomerRefreshToken.create({ customer_id: customerId, token_hash: hash, expires_at: expiresAt }, opts);
  return raw;
}

async function refreshToken(rawToken) {
  if (!rawToken) throw { status: 401, message: "Refresh token required" };

  const hash = _hashToken(rawToken);
  const record = await CustomerRefreshToken.findOne({ where: { token_hash: hash } });

  if (!record) throw { status: 401, message: "Invalid refresh token" };

  if (record.used_at) {
    await CustomerRefreshToken.destroy({ where: { customer_id: record.customer_id } });
    throw { status: 401, message: "Refresh token reuse detected. Please log in again." };
  }

  if (new Date() > new Date(record.expires_at)) {
    await record.destroy();
    throw { status: 401, message: "Refresh token expired" };
  }

  const customer = await Customer.findOne({
    where: { id: record.customer_id, is_active: 1 },
    attributes: ["id", "name", "email"],
  });
  if (!customer) throw { status: 401, message: "Customer not found or inactive" };

  const accessToken = generateToken({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    role: "customer",
  });

  const { sequelize } = require("../../database/index");
  const newRawRefreshToken = await sequelize.transaction(async (t) => {
    const token = await issueRefreshToken(customer.id, t);
    await record.update({ used_at: new Date() }, { transaction: t });
    return token;
  });

  return { token: accessToken, refresh_token: newRawRefreshToken };
}

module.exports = { signup, login, getMe, updateProfile, changePassword, refreshToken };
