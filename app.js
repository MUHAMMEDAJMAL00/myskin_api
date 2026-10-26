const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const v1Routes = require("./routes/v1/index");
const AppError = require("./utils/AppError");

const app = express();

// Trust CloudPanel/nginx reverse proxy — required for express-rate-limit to work correctly
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS === "*"
    ? true
    : process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : true,
  credentials: true,
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(requestLogger);

// Brute-force protection on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});
app.use("/api/v1/auth/login", loginLimiter);

app.get("/health", (req, res) => {
  res.json({ success: true, message: "MySkin API is running", timestamp: new Date() });
});

app.use("/api/v1", v1Routes);

app.all("*", (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use(errorHandler);

module.exports = app;
