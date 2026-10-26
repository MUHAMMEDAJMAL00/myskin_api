"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists first to avoid errors
    const tableInfo = await queryInterface.describeTable("wastages");
    if (!tableInfo.reference_number) {
      await queryInterface.addColumn("wastages", "reference_number", {
        type: Sequelize.STRING(50),
        allowNull: true,
        after: "notes"
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("wastages", "reference_number");
  },
};
