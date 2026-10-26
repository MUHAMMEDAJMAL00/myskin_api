"use strict";

/** Migration: extend discounts table to support all discount types
 *  New types:  min_qty | spend_get | category | bundle | free_item
 *  New cols:   discount_value_type, customer_group, bogo_buy_qty,
 *              bogo_get_qty, bogo_max_times, bogo_get_product_id,
 *              min_qty, category_id, bundle_product_ids, free_product_id
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "discounts";

    /* ── 1. Extend discount_type ENUM ─────────────────────────────────────── */
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN \`discount_type\`
        ENUM('flat','percent','bogo','bulk','min_qty','spend_get','category','bundle','free_item')
        NOT NULL
    `);

    /* ── 2. Add new columns (safe: only if not already present) ──────────── */
    const cols = await queryInterface.describeTable(table);

    async function addIfMissing(colName, def) {
      if (!cols[colName]) {
        await queryInterface.addColumn(table, colName, def);
      }
    }

    // Which sub-value type (percent or flat) — used by min_qty/spend_get/category/bundle
    await addIfMissing("discount_value_type", {
      type: Sequelize.ENUM("percent", "flat"),
      defaultValue: "percent",
      allowNull: false,
      comment:
        "For types that can be percent or flat (min_qty, spend_get, category, bundle)",
      after: "discount_value",
    });

    // Customer group restriction
    await addIfMissing("customer_group", {
      type: Sequelize.ENUM("all", "member", "vip", "wholesale"),
      defaultValue: "all",
      allowNull: false,
      comment: "Restrict discount to a customer group",
      after: "per_customer_limit",
    });

    // ── BOGO fields ──────────────────────────────────────────────────────────
    await addIfMissing("bogo_buy_qty", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "Buy this many…",
      after: "apply_to_id",
    });

    await addIfMissing("bogo_get_qty", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "…get this many free",
      after: "bogo_buy_qty",
    });

    await addIfMissing("bogo_max_times", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "Max times BOGO applies per order (0 = unlimited)",
      after: "bogo_get_qty",
    });

    await addIfMissing("bogo_get_product_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Free product for BOGO (null = same product as bought)",
      after: "bogo_max_times",
    });

    // ── Min Qty field ────────────────────────────────────────────────────────
    await addIfMissing("min_qty", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "Minimum quantity in cart to trigger min_qty discount",
      after: "bogo_get_product_id",
    });

    // ── Category field (separate from apply_to_id for clarity) ──────────────
    await addIfMissing("category_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Category to apply category-type discount to",
      after: "min_qty",
    });

    // ── Bundle fields ────────────────────────────────────────────────────────
    await addIfMissing("bundle_product_ids", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment:
        "Comma-separated product IDs that must all be in cart for bundle discount",
      after: "category_id",
    });

    // ── Free item fields ─────────────────────────────────────────────────────
    await addIfMissing("free_product_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Product to add free when free_item discount is triggered",
      after: "bundle_product_ids",
    });
  },

  async down(queryInterface, Sequelize) {
    const table = "discounts";

    const toRemove = [
      "discount_value_type",
      "customer_group",
      "bogo_buy_qty",
      "bogo_get_qty",
      "bogo_max_times",
      "bogo_get_product_id",
      "min_qty",
      "category_id",
      "bundle_product_ids",
      "free_product_id",
    ];

    for (const col of toRemove) {
      await queryInterface.removeColumn(table, col);
    }

    // Revert ENUM back to original
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN \`discount_type\`
        ENUM('flat','percent','bogo','bulk')
        NOT NULL
    `);
  },
};
