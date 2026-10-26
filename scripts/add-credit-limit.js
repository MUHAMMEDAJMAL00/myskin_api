"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const sequelize = require("../config/database");

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.\n");

    const dialect = sequelize.getDialect();

    if (dialect === "sqlite") {
      // SQLite does not support ALTER TABLE ... ADD COLUMN with constraints easily,
      // but basic ADD COLUMN works
      await sequelize.query(
        "ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(12,2) DEFAULT NULL"
      );
    } else {
      // MySQL / MariaDB
      const [results] = await sequelize.query(
        "SHOW COLUMNS FROM customers LIKE 'credit_limit'"
      );
      if (results.length > 0) {
        console.log("Column 'credit_limit' already exists. Nothing to do.");
      } else {
        await sequelize.query(
          "ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(12,2) DEFAULT NULL AFTER balance"
        );
        console.log("✓ Added column 'credit_limit' to customers table.");
      }
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
