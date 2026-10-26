"use strict";

const { DataTypes } = require("sequelize");

/**
 * OfferAuditLog Model
 * Immutable record of every offer applied during transaction
 * Enables:
 * - Compliance reporting
 * - Refund/return reversal
 * - Sales analysis by offer type
 * - Fraud detection
 * - Settlement reconciliation
 */

module.exports = (sequelize) => {
  const OfferAuditLog = sequelize.define(
    "OfferAuditLog",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },

      sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "sales", key: "id" },
        onDelete: "CASCADE",
        comment: "The transaction/sale where offer was applied",
      },

      offer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "The offer/discount that was applied",
      },

      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "products", key: "id" },
        onDelete: "SET NULL",
        comment: "If applicable to specific product",
      },

      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: true,
        comment: "Qty of product eligible for offer",
      },

      base_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: "Amount before discount",
      },

      discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: "Discount given",
      },

      final_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: "base_amount - discount_amount",
      },

      trigger_source: {
        type: DataTypes.ENUM("barcode", "manual", "auto", "code"),
        defaultValue: "auto",
        comment:
          "barcode: scanned product barcode; manual: cashier added; auto: system auto-applied; code: coupon code",
      },

      tax_applied_before: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0,
        comment: "Was discount applied before tax?",
      },

      conflict_resolution: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment:
          "If multiple offers: priority|best_discount|stacking (how conflict resolved)",
      },

      is_refunded: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0,
        comment: "Was this discount reversed?",
      },

      refund_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Reason for refund/reversal",
      },
    },
    {
      tableName: "offer_audit_logs",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );

  OfferAuditLog.associate = (models) => {
    OfferAuditLog.belongsTo(models.Store, { foreignKey: "store_id" });
    OfferAuditLog.belongsTo(models.Sale, { foreignKey: "sale_id" });
    OfferAuditLog.belongsTo(models.Discount, { foreignKey: "offer_id" });
    OfferAuditLog.belongsTo(models.Product, { foreignKey: "product_id" });
  };

  return OfferAuditLog;
};
