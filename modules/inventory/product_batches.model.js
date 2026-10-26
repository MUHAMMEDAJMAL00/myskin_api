"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProductBatch = sequelize.define(
    "ProductBatch",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "product_variants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      batch_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      purchase_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      manufacturing_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      purchase_rate: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      selling_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true, // If null, use product's default price
      },
      initial_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.0,
      },
      current_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.0,
      },
      is_active: {
        type: DataTypes.TINYINT,
        defaultValue: 1,
      },
    },
    {
      tableName: "product_batches",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          fields: ["product_id", "store_id", "variant_id", "batch_number"],
          unique: true,
        },
      ],
    }
  );

  ProductBatch.associate = (models) => {
    ProductBatch.belongsTo(models.Product, { foreignKey: "product_id" });
    ProductBatch.belongsTo(models.Store, { foreignKey: "store_id" });
    ProductBatch.belongsTo(models.Purchase, { foreignKey: "purchase_id" });
    ProductBatch.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return ProductBatch;
};
