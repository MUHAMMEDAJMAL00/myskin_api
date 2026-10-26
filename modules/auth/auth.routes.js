"use strict";

const express = require("express");
const router = express.Router();
const {
  handleLogin,
  handleLogout,
  handleMe,
  handleChangePassword,
  handleRefresh,
} = require("./auth.controller");
const { authenticate } = require("../../middleware/auth");

// Public routes — no token needed
router.post("/login", handleLogin);

// Protected routes — token required
router.post("/logout", authenticate, handleLogout);
router.get("/me", authenticate, handleMe);
router.post("/change-password", authenticate, handleChangePassword);
router.post("/refresh", handleRefresh);

module.exports = router;
