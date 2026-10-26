const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const requiredVars = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  node_env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  },

  uploads: {
    productImages: path.join(__dirname, "../../../uploads/products"),
    temp: path.join(__dirname, "../../../uploads/temp"),
  },

  razorpay: {
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_xxxxxxxxxxxx",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
  },

  centrix: {
    apiUrl: process.env.CENTRIX_API_URL || "http://localhost:5000",
    clientId: process.env.CENTRIX_CLIENT_ID || "",
    clientSecret: process.env.CENTRIX_CLIENT_SECRET || "",
    scope: process.env.CENTRIX_SCOPE || "customers messages",
  },

  isDev: process.env.NODE_ENV !== "production",
};
