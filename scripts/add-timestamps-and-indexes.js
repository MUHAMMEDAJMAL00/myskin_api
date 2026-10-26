"use strict";

/**
 * Migration script — Phase 1 DB changes
 *
 * What it does:
 *   1. Adds created_at column to tables that were missing it
 *   2. Adds performance indexes on FK columns (child tables)
 *   3. Adds composite indexes on main transaction tables for report queries
 *
 * Safe to re-run — uses IF NOT EXISTS and IF EXISTS checks.
 *
 * Run from myskin_backend/:
 *   node scripts/add-timestamps-and-indexes.js
 */

require("../config/env");
const sequelize = require("../config/database");
const { QueryInterface, DataTypes } = require("sequelize");
const qi = sequelize.queryInterface;

async function columnExists(table, column) {
  // Without type option: returns [rows, metadata] — destructure rows correctly
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return parseInt(rows[0].cnt) > 0;
}

async function indexExists(table, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [table, indexName] }
  );
  return parseInt(rows[0].cnt) > 0;
}

async function addColumn(table, column, def) {
  if (await columnExists(table, column)) {
    console.log(`  ✓ ${table}.${column} already exists — skip`);
    return;
  }
  await qi.addColumn(table, column, def);
  console.log(`  + Added ${table}.${column}`);
}

async function addIndex(table, columns, options = {}) {
  const name = options.name || `idx_${table}_${columns.join("_")}`;
  if (await indexExists(table, name)) {
    console.log(`  ✓ index ${name} already exists — skip`);
    return;
  }
  await qi.addIndex(table, columns, { name, ...options });
  console.log(`  + Added index ${name} on ${table}(${columns.join(", ")})`);
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✓ Connected to database\n");

    // ── 1. Add created_at to child tables ───────────────────────────────────
    console.log("── Adding created_at timestamps ──────────────────────────");

    const timestampDef = {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    };

    const timestampTables = [
      "sale_items", "sale_payments",
      "purchase_items", "purchase_payments",
      "return_items", "quotation_items",
      "purchase_return_items",
      "journal_entry_lines",
      "credit_note_lines", "debit_note_lines",
      "payroll_run_lines",
    ];

    for (const table of timestampTables) {
      await addColumn(table, "created_at", timestampDef);
    }

    // sale_payments and purchase_payments also need updated_at
    const updatedAtDef = { type: DataTypes.DATE, allowNull: true, defaultValue: null };
    await addColumn("sale_payments", "updated_at", updatedAtDef);
    await addColumn("purchase_payments", "updated_at", updatedAtDef);

    // ── 2. FK indexes on child tables ────────────────────────────────────────
    console.log("\n── Adding FK indexes on child tables ─────────────────────");
    await addIndex("sale_items",            ["sale_id"]);
    await addIndex("sale_items",            ["product_id"]);
    await addIndex("sale_payments",         ["sale_id"]);
    await addIndex("purchase_items",        ["purchase_id"]);
    await addIndex("purchase_items",        ["product_id"]);
    await addIndex("purchase_payments",     ["purchase_id"]);
    await addIndex("return_items",          ["return_id"]);
    await addIndex("return_items",          ["product_id"]);
    await addIndex("quotation_items",       ["quotation_id"]);
    await addIndex("quotation_items",       ["product_id"]);
    await addIndex("purchase_return_items", ["purchase_return_id"]);
    await addIndex("purchase_return_items", ["product_id"]);
    await addIndex("journal_entry_lines",   ["journal_entry_id"]);
    await addIndex("journal_entry_lines",   ["ledger_account_id"]);
    await addIndex("credit_note_lines",     ["credit_note_id"]);
    await addIndex("debit_note_lines",      ["debit_note_id"]);
    await addIndex("payroll_run_lines",     ["payroll_run_id"]);
    await addIndex("offer_products",        ["offer_id"]);
    await addIndex("offer_products",        ["product_id"]);

    // ── 3. Composite indexes on main tables ──────────────────────────────────
    console.log("\n── Adding composite report indexes ───────────────────────");
    await addIndex("sales",        ["store_id", "sale_date"],    { name: "idx_sales_store_date" });
    await addIndex("sales",        ["store_id", "status"],       { name: "idx_sales_store_status" });
    await addIndex("sales",        ["customer_id"],              { name: "idx_sales_customer" });
    await addIndex("purchases",    ["store_id", "purchase_date"],{ name: "idx_purchases_store_date" });
    await addIndex("purchases",    ["store_id", "status"],       { name: "idx_purchases_store_status" });
    await addIndex("purchases",    ["vendor_id"],                { name: "idx_purchases_vendor" });
    await addIndex("expenses",     ["store_id", "expense_date"], { name: "idx_expenses_store_date" });
    await addIndex("expenses",     ["store_id", "category_id"],  { name: "idx_expenses_store_cat" });
    await addIndex("expenses",     ["store_id", "status"],       { name: "idx_expenses_store_status" });
    await addIndex("returns",      ["store_id"],                 { name: "idx_returns_store" });
    await addIndex("returns",      ["sale_id"],                  { name: "idx_returns_sale" });
    await addIndex("payroll_runs", ["store_id", "salary_month"], { name: "idx_payroll_store_month" });
    await addIndex("payroll_runs", ["employee_id"],              { name: "idx_payroll_employee" });
    await addIndex("account_ledger", ["store_id", "transaction_date"], { name: "idx_ledger_store_date" });

    console.log("\n✓ Migration complete. Restart your server.\n");
  } catch (err) {
    console.error("\n✗ Migration failed:", err.message);
    if (err.original) console.error("  SQL error:", err.original.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
