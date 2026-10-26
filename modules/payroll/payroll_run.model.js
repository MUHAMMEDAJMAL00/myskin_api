"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PayrollRun = sequelize.define(
    "PayrollRun",
    {
      id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id:         { type: DataTypes.INTEGER, allowNull: false },
      employee_id:      { type: DataTypes.INTEGER, allowNull: false },
      salary_month:     { type: DataTypes.STRING(7), allowNull: false },
      gross_salary:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      total_allowances: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      total_deductions: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      advance_deducted: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      net_payable:      { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payment_method:   { type: DataTypes.ENUM("Cash", "Bank", "UPI", "Cheque"), defaultValue: "Cash" },
      payment_date:     { type: DataTypes.DATEONLY, allowNull: false },
      status:           { type: DataTypes.ENUM("Paid", "Pending", "Cancelled"), defaultValue: "Paid" },
      notes:            { type: DataTypes.TEXT, allowNull: true },
      created_by:       { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "payroll_runs",
      underscored: true,
      
      paranoid: true,
      indexes: [
        { fields: ["store_id", "salary_month"] },
        { fields: ["employee_id"] },
      ],
    },
  );

  PayrollRun.associate = (models) => {
    PayrollRun.belongsTo(models.Employee,  { foreignKey: "employee_id", as: "employee" });
    PayrollRun.belongsTo(models.Store,     { foreignKey: "store_id" });
    PayrollRun.belongsTo(models.User,      { foreignKey: "created_by", as: "CreatedBy" });
    PayrollRun.hasMany(models.PayrollRunLine, { foreignKey: "payroll_run_id", as: "lines" });
  };

  return PayrollRun;
};
