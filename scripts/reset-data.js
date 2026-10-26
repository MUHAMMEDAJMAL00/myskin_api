const sequelize = require("../config/database");
const { QueryTypes } = require("sequelize");

const TABLES_TO_CLEAR = [
  // Sales
  "sale_items",
  "sale_payments",
  "sales",
  // Purchases
  "purchase_items",
  "purchase_payments",
  "purchases",
  // Returns
  "return_items",
  "returns",
  // Quotations
  "quotation_versions",
  "quotation_items",
  "quotations",
  // Products & Inventory
  "barcode_change_logs",
  "product_barcodes",
  "store_product_prices",
  "offer_audit_logs",
  "offer_conflicts",
  "offer_products",
  "discount_tiers",
  "discounts",
  "product_batches",
  "stock_movements",
  "product_inventory",
  "product_variants",
  "products",
  "categories",
  "uom_values",
  "units",
  "tax_groups",
  // Parties
  "loyalty_transactions",
  "customer_payments",
  "customers",
  "supplier_payments",
  "vendor_returns",
  "purchase_return_items",
  "purchase_returns",
  "vendors",
  "employees",
  "salary_payments",
  "payroll_run_lines",
  "payroll_runs",
  "payroll_advances",
  // Cash
  "cash_movements",
  "cash_registers",
  // Expenses
  "expenses",
  "expense_categories",
  "wastages",
  // Accounting
  "recurring_je_lines",
  "recurring_journal_entries",
  "journal_entry_lines",
  "journal_entries",
  "contra_vouchers",
  "credit_note_lines",
  "credit_notes",
  "debit_note_lines",
  "debit_notes",
  "assets",
  "account_ledger",
  // Audit & Misc
  "audit_logs",
  "notifications",
  "refresh_tokens",
];

const TABLES_TO_KEEP = [
  "stores",
  "roles",
  "permissions",
  "role_permissions",
  "users",
  "user_store_assignments",
  "account_categories",
  "ledger_accounts",
  "ledger_account_mappings",
  "app_config",
  "payment_sources",
  "sequelizemeta",
];

async function resetData() {
  console.log("=== MYSKIN SYSTEM - Reset Transactional Data ===\n");

  try {
    await sequelize.authenticate();
    console.log("Database connected.\n");

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    console.log("Foreign key checks disabled.\n");

    let cleared = 0;
    let failed = 0;

    for (const table of TABLES_TO_CLEAR) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  ✓ ${table}`);
        cleared++;
      } catch (err) {
        console.log(`  ✗ ${table} — ${err.message}`);
        failed++;
      }
    }

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("\nForeign key checks re-enabled.\n");

    console.log("=== Summary ===");
    console.log(`  Tables cleared: ${cleared}`);
    console.log(`  Tables failed:  ${failed}`);
    console.log(`  Tables kept:    ${TABLES_TO_KEEP.length} (users, roles, chart of accounts, etc.)\n`);

    if (failed > 0) {
      console.log("Some tables were not found or could not be truncated.");
      console.log("This is normal if they were already removed or renamed.\n");
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

resetData();
