"use strict";

const { login, getMe, changePassword, refreshToken } = require("./auth.service");
const { loginSchema, changePasswordSchema } = require("./auth.validation");

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
async function handleLogin(req, res) {
  try {
    // 1. Validate input
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    // 2. Call service
    const result = await login(value.username, value.password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
}

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
async function handleLogout(req, res) {
  try {
    // JWT is stateless — client simply discards the token
    // If you add a token blacklist later, handle it here
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
}

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
async function handleMe(req, res) {
  try {
    const user = await getMe(req.user.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Failed to fetch user",
    });
  }
}

// ─── POST /api/v1/auth/change-password ───────────────────────────────────────
async function handleChangePassword(req, res) {
  try {
    // 1. Validate input
    const { error, value } = changePasswordSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    // 2. Call service
    const result = await changePassword(
      req.user.id,
      value.current_password,
      value.new_password,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Failed to change password",
    });
  }
}

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────
async function handleRefresh(req, res) {
  try {
    const rawToken = req.body.refresh_token || req.headers["x-refresh-token"];
    const result = await refreshToken(rawToken);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Token refresh failed",
    });
  }
}

module.exports = { handleLogin, handleLogout, handleMe, handleChangePassword, handleRefresh };
