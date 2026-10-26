"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("journal_entries", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      reference_number: { type: Sequelize.STRING(50), allowNull: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      reference_type: { type: Sequelize.STRING(60), allowNull: true },
      reference_id: { type: Sequelize.INTEGER, allowNull: true },
      is_manual: { type: Sequelize.TINYINT(1), defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("journal_entries", ["store_id", "date"]);
    await queryInterface.addIndex("journal_entries", ["store_id", "reference_number"]);
    await queryInterface.addIndex("journal_entries", ["reference_type", "reference_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("journal_entries");
  },
};
