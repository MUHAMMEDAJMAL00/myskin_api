"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("employees", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      role: { type: Sequelize.STRING(100), allowNull: true },
      monthly_salary: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      joining_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.TINYINT(1), defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable("salary_payments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      salary_month: { type: Sequelize.STRING(7), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_method: { type: Sequelize.STRING(30), defaultValue: "cash" },
      reference_number: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      payment_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex("employees", ["store_id", "is_active"], {
      name: "idx_employees_store_active",
    });
    await queryInterface.addIndex("salary_payments", ["employee_id", "salary_month"], {
      name: "idx_salary_payments_employee_month",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("salary_payments");
    await queryInterface.dropTable("employees");
  },
};
