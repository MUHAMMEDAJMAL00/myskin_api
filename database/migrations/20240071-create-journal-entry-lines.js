"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("journal_entry_lines", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      journal_entry_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "journal_entries", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ledger_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ledger_accounts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      debit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      credit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      description: { type: Sequelize.STRING(255), allowNull: true },
    });
    await queryInterface.addIndex("journal_entry_lines", ["journal_entry_id"]);
    await queryInterface.addIndex("journal_entry_lines", ["ledger_account_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("journal_entry_lines");
  },
};
