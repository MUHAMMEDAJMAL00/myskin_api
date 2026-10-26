"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("products", "max_quantity", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("products", "max_quantity");
  },
};
