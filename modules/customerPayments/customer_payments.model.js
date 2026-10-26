"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CustomerPayment = sequelize.define(
    "CustomerPayment",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      customer_id: { type: DataTypes.INTEGER, allowNull: false },
      sale_id: { type: DataTypes.INTEGER },
      user_id: { type: DataTypes.INTEGER },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payment_method: { type: DataTypes.STRING(30), allowNull: false },
      reference_number: { type: DataTypes.STRING(100) },
      notes: { type: DataTypes.TEXT },
      payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "customer_payments",
      underscored: true,
    },
  );

  CustomerPayment.associate = (models) => {
    CustomerPayment.belongsTo(models.Customer, { foreignKey: "customer_id" });
    CustomerPayment.belongsTo(models.Sale, { foreignKey: "sale_id" });
    CustomerPayment.belongsTo(models.User, { foreignKey: "user_id" });
    CustomerPayment.belongsTo(models.Store, { foreignKey: "store_id" });
  };

  return CustomerPayment;
};
