"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add reference_number to wastages
    await queryInterface.addColumn("wastages", "reference_number", {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: "notes"
    });

    // 2. Add reference_number and return_action to vendor_returns
    await queryInterface.addColumn("vendor_returns", "reference_number", {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: "notes"
    });

    await queryInterface.addColumn("vendor_returns", "return_action", {
      type: Sequelize.ENUM("refund", "replacement", "repair", "other"),
      defaultValue: "refund",
      allowNull: false,
      after: "reference_number"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("wastages", "reference_number");
    await queryInterface.removeColumn("vendor_returns", "reference_number");
    await queryInterface.removeColumn("vendor_returns", "return_action");
  },
};
