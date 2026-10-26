"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PayrollRunLine = sequelize.define(
    "PayrollRunLine",
    {
      id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      payroll_run_id: { type: DataTypes.INTEGER, allowNull: false },
      line_type:      { type: DataTypes.ENUM("allowance", "deduction"), allowNull: false },
      label:          { type: DataTypes.STRING(150), allowNull: false },
      amount:         { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    {
      tableName: "payroll_run_lines",
      underscored: true,
      timestamps: false,
      indexes: [{ fields: ["payroll_run_id"] }],
    },
  );

  PayrollRunLine.associate = (models) => {
    PayrollRunLine.belongsTo(models.PayrollRun, { foreignKey: "payroll_run_id" });
  };

  return PayrollRunLine;
};
