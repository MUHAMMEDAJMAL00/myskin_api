"use strict";

const permissions = [
  // ── Stores ───────────────────────────────────────────────────
  { module: "stores", action: "create" },
  { module: "stores", action: "read" },
  { module: "stores", action: "update" },
  { module: "stores", action: "delete" },

  // ── Users ────────────────────────────────────────────────────
  { module: "users", action: "create" },
  { module: "users", action: "read" },
  { module: "users", action: "update" },
  { module: "users", action: "delete" },

  // ── Roles ────────────────────────────────────────────────────
  { module: "roles", action: "create" },
  { module: "roles", action: "read" },
  { module: "roles", action: "update" },
  { module: "roles", action: "delete" },

  // ── Permissions ───────────────────────────────────────────────
  { module: "permissions", action: "create" },
  { module: "permissions", action: "read" },
  { module: "permissions", action: "update" },
  { module: "permissions", action: "delete" },

  // ── Categories ────────────────────────────────────────────────
  { module: "categories", action: "create" },
  { module: "categories", action: "read" },
  { module: "categories", action: "update" },
  { module: "categories", action: "delete" },

  // ── Products ─────────────────────────────────────────────────
  { module: "products", action: "create" },
  { module: "products", action: "read" },
  { module: "products", action: "update" },
  { module: "products", action: "delete" },

  // ── Inventory ────────────────────────────────────────────────
  { module: "inventory", action: "create" },
  { module: "inventory", action: "read" },
  { module: "inventory", action: "update" },
  { module: "inventory", action: "delete" },

  // ── Units ─────────────────────────────────────────────────────
  { module: "units", action: "create" },
  { module: "units", action: "read" },
  { module: "units", action: "update" },
  { module: "units", action: "delete" },

  // ── Vendors ──────────────────────────────────────────────────
  { module: "vendors", action: "create" },
  { module: "vendors", action: "read" },
  { module: "vendors", action: "update" },
  { module: "vendors", action: "delete" },

  // ── Customers ────────────────────────────────────────────────
  { module: "customers", action: "create" },
  { module: "customers", action: "read" },
  { module: "customers", action: "update" },
  { module: "customers", action: "delete" },

  // ── Sales ────────────────────────────────────────────────────
  { module: "sales", action: "create" },
  { module: "sales", action: "read" },
  { module: "sales", action: "update" },
  { module: "sales", action: "delete" },

  // ── Purchases ────────────────────────────────────────────────
  { module: "purchases", action: "create" },
  { module: "purchases", action: "read" },
  { module: "purchases", action: "update" },
  { module: "purchases", action: "delete" },

  // ── Quotations ───────────────────────────────────────────────
  { module: "quotations", action: "create" },
  { module: "quotations", action: "read" },
  { module: "quotations", action: "update" },
  { module: "quotations", action: "delete" },

  // ── Returns ──────────────────────────────────────────────────
  { module: "returns", action: "create" },
  { module: "returns", action: "read" },
  { module: "returns", action: "update" },
  { module: "returns", action: "delete" },

  // ── Expenses ─────────────────────────────────────────────────
  { module: "expenses", action: "create" },
  { module: "expenses", action: "read" },
  { module: "expenses", action: "update" },
  { module: "expenses", action: "delete" },

  // ── Discounts ────────────────────────────────────────────────
  { module: "discounts", action: "create" },
  { module: "discounts", action: "read" },
  { module: "discounts", action: "update" },
  { module: "discounts", action: "delete" },

  // ── Customer Payments ────────────────────────────────────────
  { module: "customer_payments", action: "create" },
  { module: "customer_payments", action: "read" },
  { module: "customer_payments", action: "update" },
  { module: "customer_payments", action: "delete" },

  // ── Supplier Payments ────────────────────────────────────────
  { module: "supplier_payments", action: "create" },
  { module: "supplier_payments", action: "read" },
  { module: "supplier_payments", action: "update" },
  { module: "supplier_payments", action: "delete" },

  // ── Notifications ────────────────────────────────────────────
  { module: "notifications", action: "create" },
  { module: "notifications", action: "read" },
  { module: "notifications", action: "update" },
  { module: "notifications", action: "delete" },

  // ── Audit Log ────────────────────────────────────────────────
  { module: "audit_log", action: "read" },

  // ── Reports ──────────────────────────────────────────────────
  { module: "reports", action: "read" },

  // ── Config / Settings / Cash Register ────────────────────────
  { module: "config", action: "read" },
  { module: "config", action: "update" },

  // ── Chart of Accounts ─────────────────────────────────────────
  { module: "account_categories", action: "create" },
  { module: "account_categories", action: "read"   },
  { module: "account_categories", action: "update" },
  { module: "account_categories", action: "delete" },

  { module: "ledger_accounts", action: "create" },
  { module: "ledger_accounts", action: "read"   },
  { module: "ledger_accounts", action: "update" },
  { module: "ledger_accounts", action: "delete" },

  // ── Journal Entries ───────────────────────────────────────────
  { module: "journal_entries", action: "create" },
  { module: "journal_entries", action: "read"   },
  { module: "journal_entries", action: "update" },
  { module: "journal_entries", action: "delete" },

  // ── Contra Vouchers ───────────────────────────────────────────
  { module: "contra_vouchers", action: "create" },
  { module: "contra_vouchers", action: "read"   },
  { module: "contra_vouchers", action: "update" },
  { module: "contra_vouchers", action: "delete" },

  // ── Credit Notes ──────────────────────────────────────────────
  { module: "credit_notes", action: "create" },
  { module: "credit_notes", action: "read"   },
  { module: "credit_notes", action: "update" },
  { module: "credit_notes", action: "delete" },

  // ── Debit Notes ───────────────────────────────────────────────
  { module: "debit_notes", action: "create" },
  { module: "debit_notes", action: "read"   },
  { module: "debit_notes", action: "update" },
  { module: "debit_notes", action: "delete" },

  // ── Assets ────────────────────────────────────────────────────
  { module: "assets", action: "create" },
  { module: "assets", action: "read"   },
  { module: "assets", action: "update" },
  { module: "assets", action: "delete" },

  // ── Payroll ───────────────────────────────────────────────────
  { module: "payroll", action: "create" },
  { module: "payroll", action: "read"   },
  { module: "payroll", action: "update" },
  { module: "payroll", action: "delete" },

  // ── Employees ─────────────────────────────────────────────────
  { module: "employees", action: "create" },
  { module: "employees", action: "read"   },
  { module: "employees", action: "update" },
  { module: "employees", action: "delete" },

  // ── Recurring Journal Entries ─────────────────────────────────
  { module: "recurring_jes", action: "create" },
  { module: "recurring_jes", action: "read"   },
  { module: "recurring_jes", action: "update" },
  { module: "recurring_jes", action: "delete" },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert("permissions", permissions, {
      ignoreDuplicates: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete("permissions", null, {});
  },
};
