"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payroll_run_lines", {
      id:            { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payroll_run_id:{ type: Sequelize.INTEGER, allowNull: false, references: { model: "payroll_runs", key: "id" }, onDelete: "CASCADE" },
      line_type:     { type: Sequelize.ENUM("allowance", "deduction"), allowNull: false },
      label:         { type: Sequelize.STRING(150), allowNull: false },
      amount:        { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("payroll_run_lines");
  },
};
