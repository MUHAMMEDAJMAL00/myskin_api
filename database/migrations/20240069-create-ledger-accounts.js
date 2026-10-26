"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ledger_accounts", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "account_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      opening_balance: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      is_active: { type: Sequelize.TINYINT(1), defaultValue: 1 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("ledger_accounts", ["store_id", "category_id"]);
    await queryInterface.addIndex("ledger_accounts", ["store_id", "name"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("ledger_accounts");
  },
};
