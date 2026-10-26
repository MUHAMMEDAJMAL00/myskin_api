"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("audit_logs", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: {
        type: Sequelize.INTEGER,
        references: { model: "stores", key: "id" },
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
      },
      module: { type: Sequelize.STRING(50), allowNull: false },
      action: { type: Sequelize.STRING(50), allowNull: false },
      reference_type: { type: Sequelize.STRING(50) },
      reference_id: { type: Sequelize.INTEGER },
      old_values: { type: Sequelize.TEXT },
      new_values: { type: Sequelize.TEXT },
      ip_address: { type: Sequelize.STRING(50) },
      user_agent: { type: Sequelize.STRING(255) },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("audit_logs");
  },
};
