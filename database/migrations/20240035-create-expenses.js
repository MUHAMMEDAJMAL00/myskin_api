"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("expenses", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "expense_categories", key: "id" },
        onDelete: "SET NULL",
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_method: {
        type: Sequelize.ENUM("cash", "card", "upi", "bank", "other"),
        defaultValue: "cash",
      },
      reference_number: { type: Sequelize.STRING(100), allowNull: true },
      expense_date: { type: Sequelize.DATEONLY, allowNull: false },
      receipt_url: { type: Sequelize.STRING(255), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        defaultValue: "approved",
      },
      is_active: { type: Sequelize.TINYINT(1), defaultValue: 1 },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("expenses");
  },
};
