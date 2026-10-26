"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("customer_cart_items", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      customer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "customers", key: "id" }, onDelete: "CASCADE" },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "product_variants", key: "id" }, onDelete: "SET NULL" },
      quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("customer_cart_items", ["customer_id"]);
    await queryInterface.addIndex("customer_cart_items", ["customer_id", "product_id"], { unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("customer_cart_items"); },
};
