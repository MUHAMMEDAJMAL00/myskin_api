"use strict";

/**
 * Migration: Create offer_products table
 * Replaces comma-separated bundle_product_ids in discounts
 * Enables many-to-many relationship between offers and products
 * Improves query performance and data integrity
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("offer_products", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      offer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "Foreign key to discounts.id (offers/promotions)",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
        comment: "Product in bundle or applicable to offer",
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "product_variants", key: "id" },
        onDelete: "SET NULL",
        comment: "Optional: specific variant (e.g., 5kg vs 1kg)",
      },
      sequence: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: "Order of products in bundle (for display purposes)",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Indexes for fast lookups
    await queryInterface.addIndex("offer_products", ["offer_id"], {
      name: "idx_offer_products_offer_id",
    });
    await queryInterface.addIndex("offer_products", ["product_id"], {
      name: "idx_offer_products_product_id",
    });
    await queryInterface.addIndex(
      "offer_products",
      ["offer_id", "product_id"],
      { name: "idx_offer_products_unique" },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeTable("offer_products");
  },
};
