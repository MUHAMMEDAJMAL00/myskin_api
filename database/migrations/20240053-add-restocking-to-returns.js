"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add restocking_fee to returns table
    await queryInterface.addColumn("returns", "restocking_fee", {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0.0,
      allowNull: false,
      after: "total_amount"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("returns", "restocking_fee");
  },
};
