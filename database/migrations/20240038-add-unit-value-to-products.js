"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("products", "unit_value", {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
      after: "unit",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("products", "unit_value");
  },
};
