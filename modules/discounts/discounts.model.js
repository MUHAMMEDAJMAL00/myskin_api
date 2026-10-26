"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Discount = sequelize.define(
    "Discount",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      store_id: { type: DataTypes.INTEGER, allowNull: false },

      name: { type: DataTypes.STRING(100), allowNull: false },

      code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment:
          "Optional coupon/promo code. Null = auto-apply when conditions met",
      },

      description: { type: DataTypes.TEXT, allowNull: true },

      /* â”€â”€ Core type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      discount_type: {
        type: DataTypes.ENUM(
          "flat", // â‚¹X off order or product
          "percent", // X% off order or product
          "bogo", // Buy X get Y free
          "bulk", // Legacy qty-tier (kept for backward compat)
          "min_qty", // Buy N+ units â†’ get discount
          "spend_get", // Spend â‚¹X â†’ get discount
          "category", // X% or â‚¹X off a whole category
          "bundle", // All listed products in cart â†’ get discount
          "free_item", // Spend â‚¹X â†’ specific product added free
        ),
        allowNull: false,
      },

      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        comment: "Flat amount or % value. 0 for bogo/free_item types.",
      },

      /* Sub-type for types that can be either percent or flat */
      discount_value_type: {
        type: DataTypes.ENUM("percent", "flat"),
        defaultValue: "percent",
        allowNull: false,
        comment: "Used by: min_qty, spend_get, category, bundle",
      },

      min_order_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        comment:
          "Minimum cart total â€” used by percent/flat/spend_get/free_item",
      },

      max_discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: "Cap on percent discounts (null = no cap)",
      },

      /* â”€â”€ Scope (for flat/percent types) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      apply_to: {
        type: DataTypes.ENUM("all", "category", "product"),
        defaultValue: "all",
        comment: "Scope for flat/percent: all products, category, or product",
      },

      apply_to_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "category_id or product_id when apply_to != all",
      },

      /* â”€â”€ Customer group restriction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      customer_group: {
        type: DataTypes.ENUM("all", "member", "vip", "wholesale"),
        defaultValue: "all",
        allowNull: false,
        comment: "Restrict to a customer group (all = no restriction)",
      },

      /* â”€â”€ Usage tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      usage_limit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Max total redemptions (null = unlimited)",
      },

      usage_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      per_customer_limit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Max uses per customer (null = unlimited)",
      },

      /* â”€â”€ Validity window â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      start_date: { type: DataTypes.DATE, allowNull: true },
      end_date: { type: DataTypes.DATE, allowNull: true },

      /* â”€â”€ BOGO fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      bogo_buy_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Buy this many unitsâ€¦",
      },

      bogo_get_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "â€¦to get this many free",
      },

      bogo_max_times: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Max times BOGO triggers per order (0 = unlimited)",
      },

      bogo_get_product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment:
          "The free product in BOGO. null = same product the customer bought",
      },

      /* â”€â”€ Min Qty field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      min_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment:
          "Cart must contain at least this many units to trigger min_qty discount",
      },

      /* â”€â”€ Category discount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Target category for category-type discount",
      },

      /* â”€â”€ Bundle fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      /* â”€â”€ Free item fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      free_product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Product added free when free_item discount triggers",
      },

      /* â”€â”€ Tax handling rule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      tax_handling: {
        type: DataTypes.ENUM("before_discount", "after_discount"),
        defaultValue: "before_discount",
        allowNull: false,
        comment:
          "Tax calc: before_discount = discount on pre-tax amount (standard), after_discount = discount on tax-inclusive price",
      },

      /* â”€â”€ Per-bill purchase rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      single_use_per_bill: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0,
        allowNull: false,
        comment: "1 = offer fires at most once per transaction regardless of eligible qty",
      },

      max_per_transaction: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Hard cap on how many times offer can fire per transaction (null = unlimited)",
      },

      /* â”€â”€ Offer stock pool & barcode trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      offer_stock_type: {
        type: DataTypes.ENUM("regular", "offer_stock"),
        defaultValue: "regular",
        allowNull: false,
        comment: "regular = deduct from main stock; offer_stock = track promo units separately",
      },

      offer_trigger_barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Scanning this barcode at POS auto-activates the offer",
      },

      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    {
      tableName: "discounts",
      underscored: true,
      
      paranoid: true,
    },
  );

  Discount.associate = (models) => {
    Discount.belongsTo(models.Store, { foreignKey: "store_id" });
    Discount.hasMany(models.DiscountTier, {
      foreignKey: "discount_id",
      as: "tiers",
    });
    // âœ” NEW: Relational product association (replaces bundle_product_ids TEXT)
    Discount.hasMany(models.OfferProduct, {
      foreignKey: "offer_id",
      as: "OfferProducts",
    });
    // âœ” NEW: Conflict resolution rules
    Discount.hasMany(models.OfferConflict, {
      foreignKey: "offer_id_1",
      as: "ConflictsAsOffer1",
    });
    Discount.hasMany(models.OfferConflict, {
      foreignKey: "offer_id_2",
      as: "ConflictsAsOffer2",
    });
    // âœ” NEW: Audit trail for all applied offers
    Discount.hasMany(models.OfferAuditLog, {
      foreignKey: "offer_id",
      as: "AuditLogs",
    });
    // Optional â€” for eager-loading the free/bogo product info
    Discount.belongsTo(models.Product, {
      foreignKey: "bogo_get_product_id",
      as: "BogoProduct",
      constraints: false,
    });
    Discount.belongsTo(models.Product, {
      foreignKey: "free_product_id",
      as: "FreeProduct",
      constraints: false,
    });
    Discount.belongsTo(models.Category, {
      foreignKey: "category_id",
      as: "DiscountCategory",
      constraints: false,
    });
  };

  return Discount;
};
