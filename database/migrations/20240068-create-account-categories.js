"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("account_categories", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      group: {
        type: Sequelize.ENUM("Asset", "Liability", "Expenditure", "Income", "Equity"),
        allowNull: false,
      },
      is_active: { type: Sequelize.TINYINT(1), defaultValue: 1 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("account_categories", ["store_id"]);
    await queryInterface.addIndex("account_categories", ["store_id", "group"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("account_categories");
  },
};
