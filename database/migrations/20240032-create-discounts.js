"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("discounts", {
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
      name: { type: Sequelize.STRING(100), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      discount_type: {
        type: Sequelize.ENUM("flat", "percent", "bogo", "bulk"),
        allowNull: false,
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      min_order_amount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      max_discount_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      apply_to: {
        type: Sequelize.ENUM("all", "category", "product"),
        defaultValue: "all",
      },
      apply_to_id: { type: Sequelize.INTEGER, allowNull: true },
      usage_limit: { type: Sequelize.INTEGER, allowNull: true },
      usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      per_customer_limit: { type: Sequelize.INTEGER, allowNull: true },
      start_date: { type: Sequelize.DATE, allowNull: true },
      end_date: { type: Sequelize.DATE, allowNull: true },
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

    // MySQL natively ignores NULLs in unique indexes,
    // so multiple rows with code = NULL are allowed automatically.
    // No "where" clause needed — just add the index cleanly.
    await queryInterface.addIndex("discounts", ["store_id", "code"], {
      unique: true,
      name: "discounts_store_code_unique",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("discounts");
  },
};
