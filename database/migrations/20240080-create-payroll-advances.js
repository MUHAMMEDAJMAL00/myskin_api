"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payroll_advances", {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id:       { type: Sequelize.INTEGER, allowNull: false },
      employee_id:    { type: Sequelize.INTEGER, allowNull: false, references: { model: "employees", key: "id" }, onDelete: "RESTRICT" },
      amount:         { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      date:           { type: Sequelize.DATEONLY, allowNull: false },
      payment_method: { type: Sequelize.ENUM("Cash", "Bank", "UPI", "Cheque"), defaultValue: "Cash" },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      status:         { type: Sequelize.ENUM("Outstanding", "Recovered"), defaultValue: "Outstanding" },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("payroll_advances");
  },
};
