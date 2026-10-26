"use strict";

const express = require("express");
const router = express.Router();
const {
  handleSignup,
  handleLogin,
  handleLogout,
  handleMe,
  handleUpdateProfile,
  handleChangePassword,
  handleRefresh,
} = require("./customer-auth.controller");
const { authenticate } = require("../../middleware/auth");

// Public routes — no token needed
router.post("/signup", handleSignup);
router.post("/login", handleLogin);
router.post("/refresh", handleRefresh);

// Protected routes — token required
router.post("/logout", authenticate, handleLogout);
router.get("/me", authenticate, handleMe);
router.patch("/me", authenticate, handleUpdateProfile);
router.post("/change-password", authenticate, handleChangePassword);

module.exports = router;
