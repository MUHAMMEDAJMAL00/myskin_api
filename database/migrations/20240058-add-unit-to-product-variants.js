"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("product_variants", "unit", {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: "Unit of quantity (kg, L, ml, pcs, etc.)",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("product_variants", "unit");
  },
};
