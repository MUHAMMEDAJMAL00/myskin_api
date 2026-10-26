"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("products", "brand", {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      after: "description",
    });
    await queryInterface.addColumn("products", "mrp", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
      after: "selling_price",
    });
    await queryInterface.addColumn("products", "tax_included", {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      after: "tax_rate",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("products", "brand");
    await queryInterface.removeColumn("products", "mrp");
    await queryInterface.removeColumn("products", "tax_included");
  },
};
