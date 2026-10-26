"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("credit_note_lines", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      credit_note_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "credit_notes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      description: { type: Sequelize.STRING(255), allowNull: false },
      qty: { type: Sequelize.DECIMAL(12, 3), defaultValue: 1 },
      rate: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
    });
    await queryInterface.addIndex("credit_note_lines", ["credit_note_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("credit_note_lines");
  },
};
