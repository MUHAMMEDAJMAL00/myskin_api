"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StoreProductPrice = sequelize.define(
    "StoreProductPrice",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    },
    {
      tableName: "store_product_prices",
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ["store_id", "product_id"] },
      ],
    },
  );

  StoreProductPrice.associate = (models) => {
    StoreProductPrice.belongsTo(models.Store, { foreignKey: "store_id" });
    StoreProductPrice.belongsTo(models.Product, { foreignKey: "product_id" });
  };

  return StoreProductPrice;
};
