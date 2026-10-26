"use strict";

const jwt = require("jsonwebtoken");
const env = require("../config/env");

// ─── Authenticate Middleware ──────────────────────────────────────────────────
function authenticate(req, res, next) {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // 2. Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token missing.",
      });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, env.jwt.secret);

    // 4. Validate required fields in token
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    // 5. Attach user to request
    req.user = decoded;

    const role = (decoded.role || "").toLowerCase();
    req.isSuperAdmin = role === "super_admin";

    // 6. Attach store context
    // super_admin: only X-Store-ID header sets a store scope; otherwise null (= global access)
    // all other roles: header > JWT > query param (must have a store)
    if (req.isSuperAdmin) {
      req.storeId = parseInt(req.headers["x-store-id"]) || null;
    } else {
      // JWT store_id is the primary source (cannot be overridden by client).
      // X-Store-ID header is accepted as fallback only when JWT has no store_id
      // (handles sessions issued before store_id was added to the token payload).
      req.storeId = decoded.store_id || parseInt(req.headers["x-store-id"]) || null;
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Authentication error.",
    });
  }
}

// ─── Optional: Check if user is admin ────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super admin only.",
    });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
