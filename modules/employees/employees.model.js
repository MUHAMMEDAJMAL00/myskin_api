"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Employee = sequelize.define(
    "Employee",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      role: { type: DataTypes.STRING(100), allowNull: true },
      monthly_salary: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      joining_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    {
      tableName: "employees",
      underscored: true,
      
      paranoid: true,
    },
  );

  Employee.associate = (models) => {
    Employee.belongsTo(models.Store, { foreignKey: "store_id" });
    Employee.hasMany(models.SalaryPayment, {
      foreignKey: "employee_id",
      as: "salary_payments",
    });
  };

  return Employee;
};
