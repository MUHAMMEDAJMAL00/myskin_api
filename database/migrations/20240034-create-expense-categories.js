"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("expense_categories", {
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
      description: { type: Sequelize.TEXT, allowNull: true },
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
    await queryInterface.dropTable("expense_categories");
  },
};
