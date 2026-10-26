"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("customers", "password_hash", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "phone",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("customers", "password_hash");
  },
};
