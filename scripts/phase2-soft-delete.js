"use strict";

/**
 * Phase 2 Migration — Add deleted_at (soft delete) column to 17 tables
 *
 * Safe to re-run — skips tables that already have the column.
 *
 * Run from myskin_backend/:
 *   node scripts/phase2-soft-delete.js
 */

require("../config/env");
const sequelize = require("../config/database");

const TABLES = [
  "sales", "purchases", "returns", "purchase_returns",
  "customers", "vendors", "expenses", "payroll_runs",
  "journal_entries", "account_ledger", "quotations", "assets",
  "credit_notes", "debit_notes", "employees", "discounts", "contra_vouchers",
];

async function columnExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'deleted_at'`,
    { replacements: [table] }
  );
  return parseInt(rows[0].cnt) > 0;
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✓ Connected to database\n── Adding deleted_at columns ───────────────");

    for (const table of TABLES) {
      if (await columnExists(table)) {
        console.log(`  ✓ ${table}.deleted_at already exists — skip`);
        continue;
      }
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`deleted_at\` DATETIME NULL DEFAULT NULL`
      );
      // Add index for performance (WHERE deleted_at IS NULL is on every query)
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD INDEX \`idx_${table}_deleted_at\` (\`deleted_at\`)`
      ).catch(() => {}); // ignore if index already exists
      console.log(`  + Added ${table}.deleted_at`);
    }

    console.log("\n✓ Soft delete migration complete. Restart your server.\n");
  } catch (err) {
    console.error("\n✗ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
