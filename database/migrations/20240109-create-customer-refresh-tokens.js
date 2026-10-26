"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("customer_refresh_tokens", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "customers", key: "id" },
        onDelete: "CASCADE",
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex("customer_refresh_tokens", ["customer_id"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("customer_refresh_tokens");
  },
};
