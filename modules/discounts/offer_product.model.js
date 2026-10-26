"use strict";

const { DataTypes } = require("sequelize");

/**
 * OfferProduct Model
 * Represents the many-to-many relationship between Offers/Discounts and Products
 * Replaces comma-separated product_ids in discount model
 *
 * Example use cases:
 * - Bundle offer: 3 products must all be in cart
 * - BOGO: buy product A, get B free
 * - Category offer: applicable to specific products (not whole category)
 */

module.exports = (sequelize) => {
  const OfferProduct = sequelize.define(
    "OfferProduct",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      offer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
      },

      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },

      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "product_variants", key: "id" },
        onDelete: "SET NULL",
        comment: "Specific product variant if needed (e.g., 5kg variant)",
      },

      sequence: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "For display/ordering in bundles",
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "offer_products",
      underscored: true,
      timestamps: false,
      createdAt: "created_at",
      indexes: [
        { fields: ["offer_id"] },
        { fields: ["product_id"] },
      ],
    },
  );

  OfferProduct.associate = (models) => {
    OfferProduct.belongsTo(models.Discount, {
      foreignKey: "offer_id",
      as: "offer",
    });
    OfferProduct.belongsTo(models.Product, {
      foreignKey: "product_id",
      as: "product",
    });
    OfferProduct.belongsTo(models.ProductVariant, {
      foreignKey: "variant_id",
      as: "variant",
    });
  };

  return OfferProduct;
};
