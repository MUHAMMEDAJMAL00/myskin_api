"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("customer_addresses", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      customer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "customers", key: "id" }, onDelete: "CASCADE" },
      name: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(20) },
      address_type: { type: Sequelize.STRING(20), defaultValue: "Home" },
      full_address: { type: Sequelize.TEXT },
      street: { type: Sequelize.STRING(200) },
      city: { type: Sequelize.STRING(100) },
      state: { type: Sequelize.STRING(100) },
      country: { type: Sequelize.STRING(100), defaultValue: "India" },
      postal_code: { type: Sequelize.STRING(20) },
      is_default: { type: Sequelize.TINYINT, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("customer_addresses", ["customer_id"]);
  },
  down: async (queryInterface) => { await queryInterface.dropTable("customer_addresses"); },
};
