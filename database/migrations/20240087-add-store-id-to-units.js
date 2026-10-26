"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("units", "store_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "stores", key: "id" },
      onDelete: "CASCADE",
      after: "id",
    });
    await queryInterface.addIndex("units", ["store_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex("units", ["store_id"]);
    await queryInterface.removeColumn("units", "store_id");
  },
};
