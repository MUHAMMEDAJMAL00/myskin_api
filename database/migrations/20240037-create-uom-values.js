"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("uom_values", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "units", key: "id" },
        onDelete: "CASCADE",
      },
      value: { type: Sequelize.DECIMAL(10, 3), allowNull: false },
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
    await queryInterface.dropTable("uom_values");
  },
};
