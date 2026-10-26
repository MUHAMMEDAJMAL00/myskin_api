"use strict";

/**
 * Migration: Create offer_audit_logs table
 * Tracks every offer applied during checkout
 * Enables traceability, refund handling, and compliance reporting
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("offer_audit_logs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },
      sale_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "sales", key: "id" },
        onDelete: "CASCADE",
        comment: "The sale/transaction where offer was applied",
      },
      offer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "The offer/discount applied",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "products", key: "id" },
        onDelete: "SET NULL",
        comment: "If offer applied to specific product",
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: true,
        comment: "Quantity eligible for offer",
      },
      base_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: "Amount before discount",
      },
      discount_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: "Discount applied",
      },
      final_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: "Amount after discount (base_amount - discount_amount)",
      },
      trigger_source: {
        type: Sequelize.ENUM("barcode", "manual", "auto", "code"),
        defaultValue: "auto",
        comment: "How offer was triggered (barcode scan, manual entry, automatic, coupon code)",
      },
      tax_applied_before: {
        type: Sequelize.TINYINT(1),
        defaultValue: 0,
        comment: "Was discount applied before tax calculation?",
      },
      conflict_resolution: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "If multiple offers, how was conflict resolved",
      },
      is_refunded: {
        type: Sequelize.TINYINT(1),
        defaultValue: 0,
        comment: "Was this offer reversed (refund/return)?",
      },
      refund_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Reason for refund (if refunded)",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Indexes for fast lookups
    await queryInterface.addIndex("offer_audit_logs", ["store_id"], {
      name: "idx_offer_audit_store_id",
    });
    await queryInterface.addIndex("offer_audit_logs", ["sale_id"], {
      name: "idx_offer_audit_sale_id",
    });
    await queryInterface.addIndex("offer_audit_logs", ["offer_id"], {
      name: "idx_offer_audit_offer_id",
    });
    await queryInterface.addIndex("offer_audit_logs", ["product_id"], {
      name: "idx_offer_audit_product_id",
    });
    await queryInterface.addIndex("offer_audit_logs", ["created_at"], {
      name: "idx_offer_audit_created_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeTable("offer_audit_logs");
  },
};
