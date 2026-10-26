"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("notifications", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: {
        type: Sequelize.INTEGER,
        references: { model: "stores", key: "id" },
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
      },
      type: {
        type: Sequelize.ENUM(
          "low_stock",
          "payment_due",
          "cash_register",
          "system",
        ),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      message: { type: Sequelize.TEXT },
      reference_type: { type: Sequelize.STRING(50) }, // product | sale | purchase | vendor
      reference_id: { type: Sequelize.INTEGER },
      is_read: { type: Sequelize.TINYINT(1), defaultValue: 0 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("notifications");
  },
};
