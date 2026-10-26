"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("products", "hsn_code", {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: "barcode",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("products", "hsn_code");
  },
};
