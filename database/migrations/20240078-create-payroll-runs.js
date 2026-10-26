"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payroll_runs", {
      id:               { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id:         { type: Sequelize.INTEGER, allowNull: false },
      employee_id:      { type: Sequelize.INTEGER, allowNull: false, references: { model: "employees", key: "id" }, onDelete: "RESTRICT" },
      salary_month:     { type: Sequelize.STRING(7), allowNull: false },
      gross_salary:     { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total_allowances: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total_deductions: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      advance_deducted: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      net_payable:      { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_method:   { type: Sequelize.ENUM("Cash", "Bank", "UPI", "Cheque"), defaultValue: "Cash" },
      payment_date:     { type: Sequelize.DATEONLY, allowNull: false },
      status:           { type: Sequelize.ENUM("Paid", "Pending"), defaultValue: "Paid" },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      created_by:       { type: Sequelize.INTEGER, allowNull: true },
      created_at:       { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at:       { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("payroll_runs");
  },
};
