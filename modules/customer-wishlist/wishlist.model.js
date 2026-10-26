"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CustomerWishlist = sequelize.define(
    "CustomerWishlist",
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
    },
    {
      tableName: "customer_wishlist_items",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["customer_id"] },
        { fields: ["customer_id", "product_id"], unique: true },
      ],
    },
  );

  CustomerWishlist.associate = (models) => {
    CustomerWishlist.belongsTo(models.Customer, { foreignKey: "customer_id" });
    CustomerWishlist.belongsTo(models.Product, { foreignKey: "product_id" });
  };

  return CustomerWishlist;
};
