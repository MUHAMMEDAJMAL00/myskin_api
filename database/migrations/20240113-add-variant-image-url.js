"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("product_variants", "image_url", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "mrp",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("product_variants", "image_url");
  },
};
