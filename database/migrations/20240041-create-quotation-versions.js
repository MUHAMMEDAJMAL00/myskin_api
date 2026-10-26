"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("quotation_versions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      quotation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "quotations", key: "id" },
        onDelete: "CASCADE",
      },
      version_number: { type: Sequelize.INTEGER, allowNull: false },
      snapshot: { type: Sequelize.TEXT("long"), allowNull: false },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      change_notes: { type: Sequelize.STRING(255), allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("quotation_versions", ["quotation_id"], {
      name: "idx_quot_versions_quotation_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("quotation_versions");
  },
};
