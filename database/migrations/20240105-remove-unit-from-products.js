"use strict";

module.exports = {
  async up(queryInterface) {
    const cols = await queryInterface.describeTable("products");
    if (cols.unit) {
      await queryInterface.removeColumn("products", "unit");
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "unit", {
      type: Sequelize.STRING(30),
      allowNull: true,
      defaultValue: "pcs",
    });
  },
};
