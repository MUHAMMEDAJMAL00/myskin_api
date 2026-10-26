"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PayrollAdvance = sequelize.define(
    "PayrollAdvance",
    {
      id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id:       { type: DataTypes.INTEGER, allowNull: false },
      employee_id:    { type: DataTypes.INTEGER, allowNull: false },
      amount:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      date:           { type: DataTypes.DATEONLY, allowNull: false },
      payment_method: { type: DataTypes.ENUM("Cash", "Bank", "UPI", "Cheque"), defaultValue: "Cash" },
      notes:          { type: DataTypes.TEXT, allowNull: true },
      status:         { type: DataTypes.ENUM("Outstanding", "Recovered"), defaultValue: "Outstanding" },
      created_by:     { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "payroll_advances",
      underscored: true,
      timestamps: true,
    },
  );

  PayrollAdvance.associate = (models) => {
    PayrollAdvance.belongsTo(models.Employee, { foreignKey: "employee_id", as: "employee" });
    PayrollAdvance.belongsTo(models.Store,    { foreignKey: "store_id" });
    PayrollAdvance.belongsTo(models.User,     { foreignKey: "created_by", as: "CreatedBy" });
  };

  return PayrollAdvance;
};
