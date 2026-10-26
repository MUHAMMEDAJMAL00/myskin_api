"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CustomerCart = sequelize.define(
    "CustomerCart",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: "customers", key: "id" }, onDelete: "CASCADE",
      },
      product_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: "products", key: "id" }, onDelete: "CASCADE",
      },
      variant_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: "product_variants", key: "id" }, onDelete: "SET NULL",
      },
      quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
    },
    {
      tableName: "customer_cart_items",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["customer_id"] },
        { fields: ["customer_id", "product_id"], unique: true },
      ],
    },
  );

  CustomerCart.associate = (models) => {
    CustomerCart.belongsTo(models.Customer, { foreignKey: "customer_id" });
    CustomerCart.belongsTo(models.Product, { foreignKey: "product_id" });
    CustomerCart.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return CustomerCart;
};
