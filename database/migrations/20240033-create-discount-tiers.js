"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("discount_tiers", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      discount_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
      },
      min_quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
      },
      max_quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      discount_type: {
        type: Sequelize.ENUM("flat", "percent"),
        allowNull: false,
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
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
    await queryInterface.dropTable("discount_tiers");
  },
};
