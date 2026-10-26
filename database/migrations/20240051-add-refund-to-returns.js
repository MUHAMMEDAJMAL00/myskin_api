"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add refund_amount to vendor_returns
    await queryInterface.addColumn("vendor_returns", "refund_amount", {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0.0,
      allowNull: false,
      after: "return_action"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("vendor_returns", "refund_amount");
  },
};
