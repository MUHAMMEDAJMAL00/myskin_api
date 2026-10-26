"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payment_sources", {
      id:            { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name:          { type: Sequelize.STRING(80),  allowNull: false },
      type:          { type: Sequelize.ENUM("cash", "upi", "card", "bank", "other"), allowNull: false },
      is_active:     { type: Sequelize.BOOLEAN, defaultValue: true },
      display_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      notes:         { type: Sequelize.STRING(255), allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Seed default payment sources
    await queryInterface.bulkInsert("payment_sources", [
      { name: "Cash",       type: "cash",  is_active: true, display_order: 1, notes: null, created_at: new Date(), updated_at: new Date() },
      { name: "Card",       type: "card",  is_active: true, display_order: 2, notes: null, created_at: new Date(), updated_at: new Date() },
      { name: "UPI",        type: "upi",   is_active: true, display_order: 3, notes: null, created_at: new Date(), updated_at: new Date() },
      { name: "Bank Transfer", type: "bank", is_active: true, display_order: 4, notes: null, created_at: new Date(), updated_at: new Date() },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("payment_sources");
  },
};
