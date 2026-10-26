"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CustomerAddress = sequelize.define(
    "CustomerAddress",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: "customers", key: "id" }, onDelete: "CASCADE",
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(20) },
      address_type: { type: DataTypes.STRING(20), defaultValue: "Home" },
      full_address: { type: DataTypes.TEXT },
      street: { type: DataTypes.STRING(200) },
      city: { type: DataTypes.STRING(100) },
      state: { type: DataTypes.STRING(100) },
      country: { type: DataTypes.STRING(100), defaultValue: "India" },
      postal_code: { type: DataTypes.STRING(20) },
      is_default: { type: DataTypes.TINYINT, defaultValue: 0 },
    },
    {
      tableName: "customer_addresses",
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ["customer_id"] }],
    },
  );

  CustomerAddress.associate = (models) => {
    CustomerAddress.belongsTo(models.Customer, { foreignKey: "customer_id" });
  };

  return CustomerAddress;
};
