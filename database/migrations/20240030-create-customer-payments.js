"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("customer_payments", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: {
        type: Sequelize.INTEGER,
        references: { model: "stores", key: "id" },
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "customers", key: "id" },
      },
      sale_id: {
        type: Sequelize.INTEGER,
        references: { model: "sales", key: "id" },
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_method: { type: Sequelize.STRING(30), allowNull: false },
      reference_number: { type: Sequelize.STRING(100) },
      notes: { type: Sequelize.TEXT },
      payment_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("customer_payments");
  },
};
