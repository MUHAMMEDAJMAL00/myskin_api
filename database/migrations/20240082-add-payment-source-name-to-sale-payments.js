"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sale_payments", "payment_source_name", {
      type: Sequelize.STRING(80),
      allowNull: true,
      after: "payment_method",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("sale_payments", "payment_source_name");
  },
};
