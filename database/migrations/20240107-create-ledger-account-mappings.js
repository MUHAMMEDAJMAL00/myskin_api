"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ledger_account_mappings", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      mapping_key: { type: Sequelize.STRING(80), allowNull: false },
      ledger_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ledger_accounts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("ledger_account_mappings", ["store_id", "mapping_key"], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("ledger_account_mappings");
  },
};
