"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CustomerRefreshToken = sequelize.define(
    "CustomerRefreshToken",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "customers", key: "id" },
        onDelete: "CASCADE",
      },
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "customer_refresh_tokens",
      underscored: true,
      updatedAt: false,
      indexes: [{ fields: ["customer_id"] }],
    },
  );

  CustomerRefreshToken.associate = (models) => {
    CustomerRefreshToken.belongsTo(models.Customer, { foreignKey: "customer_id" });
  };

  return CustomerRefreshToken;
};
