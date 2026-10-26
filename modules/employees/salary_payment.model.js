"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SalaryPayment = sequelize.define(
    "SalaryPayment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      salary_month: { type: DataTypes.STRING(7), allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payment_method: { type: DataTypes.STRING(30), defaultValue: "cash" },
      reference_number: { type: DataTypes.STRING(100), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "salary_payments",
      underscored: true,
      timestamps: true,
    },
  );

  SalaryPayment.associate = (models) => {
    SalaryPayment.belongsTo(models.Employee, { foreignKey: "employee_id" });
    SalaryPayment.belongsTo(models.Store, { foreignKey: "store_id" });
    SalaryPayment.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return SalaryPayment;
};
