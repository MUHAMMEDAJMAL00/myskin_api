"use strict";

const { DataTypes } = require("sequelize");

/**
 * ProductVariant Model
 * Represents variations of a product (size, weight, packaging)
 *
 * Examples:
 * - Product: "Boost Drink"
 *   - Variant 1: 5L, ₹500, 15% discount
 *   - Variant 2: 1L, ₹150, 10% discount
 *   - Variant 3: 200ml, ₹40, no discount
 *
 * - Product: "Rice"
 *   - Variant 1: 10kg bag, ₹500
 *   - Variant 2: 1kg pack, ₹60
 */

module.exports = (sequelize) => {
  const ProductVariant = sequelize.define(
    "ProductVariant",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
        comment: "Parent product",
      },

      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
        comment: "Store this variant is available at",
      },

      variant_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "e.g., '5kg', '1L', '500g'",
      },

      sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Variant-specific SKU (optional)",
      },

      barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Barcode specific to this variant",
      },

      purchase_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: "Cost price for this variant",
      },

      selling_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: "List/retail price for this variant",
      },

      mrp: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: "Optional: different MRP per variant",
      },

      image_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Variant-specific image",
      },

      discount_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "discounts", key: "id" },
        onDelete: "SET NULL",
        comment: "Offer/discount specific to this variant",
      },

      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: true,
        comment: "Quantity in base unit (e.g., 5 for 5kg)",
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "Unit of quantity (kg, L, ml, pcs, etc.)",
      },

      is_active: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1,
        comment: "Can customers buy this variant?",
      },
    },
    {
      tableName: "product_variants",
      underscored: true,
      timestamps: true,
    },
  );

  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, { foreignKey: "product_id" });
    ProductVariant.belongsTo(models.Store, { foreignKey: "store_id" });
    ProductVariant.belongsTo(models.Discount, {
      foreignKey: "discount_id",
      as: "Discount",
    });
    ProductVariant.hasMany(models.OfferProduct, {
      foreignKey: "variant_id",
      as: "OfferProducts",
    });
  };

  return ProductVariant;
};
