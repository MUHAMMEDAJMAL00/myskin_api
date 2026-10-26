"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("tax_groups", "category", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "GST",
      after: "name",
    });
    await queryInterface.addColumn("tax_groups", "is_inter_state", {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      after: "components",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("tax_groups", "is_inter_state");
    await queryInterface.removeColumn("tax_groups", "category");
  },
};
