"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("assets", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: { type: Sequelize.STRING(100), allowNull: true },
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      depreciation_rate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0.0 },
      accumulated_depreciation: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      current_book_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM("Active", "Disposed"),
        defaultValue: "Active",
      },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("assets", ["store_id", "status"]);
    await queryInterface.addIndex("assets", ["store_id", "category"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("assets");
  },
};
