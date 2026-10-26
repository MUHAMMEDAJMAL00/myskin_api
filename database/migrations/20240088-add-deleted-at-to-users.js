"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("users", "deleted_at");
  },
};
