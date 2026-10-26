const AppError = require("../utils/AppError");

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // For known operational errors, send the intended message
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    const field = (err.errors && err.errors[0] && err.errors[0].path) || "field";
    message = `Duplicate value for ${field}`;
  } else if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message = "Related record not found (foreign key violation)";
  } else if (err.name === "SequelizeValidationError") {
    statusCode = 422;
    message = (err.errors && err.errors.map((e) => e.message).join("; ")) || err.message;
  } else if (process.env.NODE_ENV === "production") {
    // Programming errors — hide details in production
    message = "Internal Server Error";
  }

  const sqlMsg = (err.original && (err.original.sqlMessage || err.original.message)) || null;
  console.error(`[ERROR] ${statusCode} - ${message}${sqlMsg ? " | SQL: " + sqlMsg : ""}`, err.stack && "\n" + err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      detail: sqlMsg,
      stack: err.stack,
    }),
  });
};

module.exports = errorHandler;
