"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create wastages table
    await queryInterface.createTable("wastages", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      reason: { type: Sequelize.STRING(100), allowNull: false },
      notes: { type: Sequelize.TEXT },
      wastage_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 2. Create vendor_returns table
    await queryInterface.createTable("vendor_returns", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "vendors", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      purchase_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "purchases", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      reason: { type: Sequelize.STRING(100), allowNull: false },
      notes: { type: Sequelize.TEXT },
      return_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("vendor_returns");
    await queryInterface.dropTable("wastages");
  },
};
