"use strict";

/**
 * Migration: Create product_variants table
 * Supports product variants like 5kg, 1kg, 500g with different prices and discounts
 * Enables fine-grained discount control per variant
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("product_variants", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
        comment: "Parent product",
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
        comment: "Store this variant is available at",
      },
      variant_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: "e.g., '5kg', '1kg', '500g'",
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Variant-specific SKU",
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        comment: "Variant-specific barcode",
      },
      purchase_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: "Cost price for this variant",
      },
      selling_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: "MRP/list price for this variant",
      },
      mrp: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: "Optional: different MRP per variant",
      },
      discount_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "discounts", key: "id" },
        onDelete: "SET NULL",
        comment: "Offer/discount specific to this variant",
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: true,
        comment: "Quantity in base unit (e.g., 5 for 5kg)",
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Indexes
    await queryInterface.addIndex("product_variants", ["product_id"], {
      name: "idx_product_variants_product_id",
    });
    await queryInterface.addIndex("product_variants", ["store_id"], {
      name: "idx_product_variants_store_id",
    });
    await queryInterface.addIndex("product_variants", ["barcode"], {
      name: "idx_product_variants_barcode",
    });
    await queryInterface.addIndex("product_variants", ["sku"], {
      name: "idx_product_variants_sku",
    });
    await queryInterface.addIndex("product_variants", ["discount_id"], {
      name: "idx_product_variants_discount_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeTable("product_variants");
  },
};
