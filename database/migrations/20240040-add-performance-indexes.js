"use strict";

module.exports = {
  up: async (queryInterface) => {
    // ── CRITICAL: FK lookup indexes missing from core transaction tables ──────

    await queryInterface.addIndex("sale_items", ["sale_id"], {
      name: "idx_sale_items_sale_id",
    });
    await queryInterface.addIndex("sale_payments", ["sale_id"], {
      name: "idx_sale_payments_sale_id",
    });
    await queryInterface.addIndex("purchase_items", ["purchase_id"], {
      name: "idx_purchase_items_purchase_id",
    });
    await queryInterface.addIndex("returns", ["store_id"], {
      name: "idx_returns_store_id",
    });
    await queryInterface.addIndex(
      "cash_registers",
      ["store_id", "user_id", "status"],
      { name: "idx_cash_registers_store_user_status" },
    );
    await queryInterface.addIndex("cash_movements", ["cash_register_id"], {
      name: "idx_cash_movements_register_id",
    });

    // ── HIGH: Frequently filtered/joined tables ───────────────────────────────

    await queryInterface.addIndex("purchases", ["store_id"], {
      name: "idx_purchases_store_id",
    });
    await queryInterface.addIndex("quotations", ["store_id"], {
      name: "idx_quotations_store_id",
    });
    await queryInterface.addIndex("quotations", ["status"], {
      name: "idx_quotations_status",
    });
    await queryInterface.addIndex("quotation_items", ["quotation_id"], {
      name: "idx_quotation_items_quotation_id",
    });
    await queryInterface.addIndex(
      "expenses",
      ["store_id", "expense_date"],
      { name: "idx_expenses_store_date" },
    );
    await queryInterface.addIndex(
      "expenses",
      ["store_id", "category_id"],
      { name: "idx_expenses_store_category" },
    );
    await queryInterface.addIndex(
      "expense_categories",
      ["store_id", "is_active"],
      { name: "idx_expense_categories_store_active" },
    );
    // discounts.(store_id, code) is already a unique index from migration 20240032
    await queryInterface.addIndex(
      "discounts",
      ["store_id", "is_active"],
      { name: "idx_discounts_store_active" },
    );
    await queryInterface.addIndex(
      "notifications",
      ["user_id", "store_id"],
      { name: "idx_notifications_user_store" },
    );
    await queryInterface.addIndex(
      "notifications",
      ["user_id", "is_read"],
      { name: "idx_notifications_user_read" },
    );
    await queryInterface.addIndex(
      "audit_logs",
      ["store_id", "module"],
      { name: "idx_audit_logs_store_module" },
    );
    await queryInterface.addIndex(
      "audit_logs",
      ["store_id", "created_at"],
      { name: "idx_audit_logs_store_date" },
    );
    await queryInterface.addIndex("products", ["is_active"], {
      name: "idx_products_is_active",
    });
    await queryInterface.addIndex("products", ["is_active", "is_service"], {
      name: "idx_products_active_service",
    });

    // ── MEDIUM: Supporting indexes for joins and reporting ────────────────────

    await queryInterface.addIndex("return_items", ["return_id"], {
      name: "idx_return_items_return_id",
    });
    await queryInterface.addIndex("purchase_payments", ["purchase_id"], {
      name: "idx_purchase_payments_purchase_id",
    });
    await queryInterface.addIndex("user_store_assignments", ["user_id"], {
      name: "idx_user_store_user_id",
    });
    await queryInterface.addIndex(
      "user_store_assignments",
      ["user_id", "store_id"],
      { name: "idx_user_store_user_store" },
    );
    await queryInterface.addIndex("stock_movements", ["store_id"], {
      name: "idx_stockmov_store_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("sale_items", "idx_sale_items_sale_id");
    await queryInterface.removeIndex("sale_payments", "idx_sale_payments_sale_id");
    await queryInterface.removeIndex("purchase_items", "idx_purchase_items_purchase_id");
    await queryInterface.removeIndex("returns", "idx_returns_store_id");
    await queryInterface.removeIndex("cash_registers", "idx_cash_registers_store_user_status");
    await queryInterface.removeIndex("cash_movements", "idx_cash_movements_register_id");
    await queryInterface.removeIndex("purchases", "idx_purchases_store_id");
    await queryInterface.removeIndex("quotations", "idx_quotations_store_id");
    await queryInterface.removeIndex("quotations", "idx_quotations_status");
    await queryInterface.removeIndex("quotation_items", "idx_quotation_items_quotation_id");
    await queryInterface.removeIndex("expenses", "idx_expenses_store_date");
    await queryInterface.removeIndex("expenses", "idx_expenses_store_category");
    await queryInterface.removeIndex("expense_categories", "idx_expense_categories_store_active");
    await queryInterface.removeIndex("discounts", "idx_discounts_store_active");
    await queryInterface.removeIndex("notifications", "idx_notifications_user_store");
    await queryInterface.removeIndex("notifications", "idx_notifications_user_read");
    await queryInterface.removeIndex("audit_logs", "idx_audit_logs_store_module");
    await queryInterface.removeIndex("audit_logs", "idx_audit_logs_store_date");
    await queryInterface.removeIndex("products", "idx_products_is_active");
    await queryInterface.removeIndex("products", "idx_products_active_service");
    await queryInterface.removeIndex("return_items", "idx_return_items_return_id");
    await queryInterface.removeIndex("purchase_payments", "idx_purchase_payments_purchase_id");
    await queryInterface.removeIndex("user_store_assignments", "idx_user_store_user_id");
    await queryInterface.removeIndex("user_store_assignments", "idx_user_store_user_store");
    await queryInterface.removeIndex("stock_movements", "idx_stockmov_store_id");
  },
};
