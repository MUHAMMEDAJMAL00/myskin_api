"use strict";

const {
  signup,
  login,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
} = require("./customer-auth.service");
const {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require("./customer-auth.validation");

// ─── POST /api/v1/customer-auth/signup ─────────────────────────────────────────
async function handleSignup(req, res) {
  try {
    const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const result = await signup(value);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Signup failed",
    });
  }
}

// ─── POST /api/v1/customer-auth/login ──────────────────────────────────────────
async function handleLogin(req, res) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const result = await login(value.email, value.password);

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

// ─── POST /api/v1/customer-auth/logout ─────────────────────────────────────────
async function handleLogout(req, res) {
  try {
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

// ─── GET /api/v1/customer-auth/me ──────────────────────────────────────────────
async function handleMe(req, res) {
  try {
    const customer = await getMe(req.user.id);
    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Failed to fetch profile",
    });
  }
}

// ─── PATCH /api/v1/customer-auth/me ────────────────────────────────────────────
async function handleUpdateProfile(req, res) {
  try {
    const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const customer = await updateProfile(req.user.id, value);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: customer,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Failed to update profile",
    });
  }
}

// ─── POST /api/v1/customer-auth/change-password ────────────────────────────────
async function handleChangePassword(req, res) {
  try {
    const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    const result = await changePassword(req.user.id, value.current_password, value.new_password);

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

// ─── POST /api/v1/customer-auth/refresh ────────────────────────────────────────
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

module.exports = {
  handleSignup,
  handleLogin,
  handleLogout,
  handleMe,
  handleUpdateProfile,
  handleChangePassword,
  handleRefresh,
};
