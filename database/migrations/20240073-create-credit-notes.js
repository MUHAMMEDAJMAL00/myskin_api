"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("credit_notes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      credit_note_number: { type: Sequelize.STRING(50), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      customer_id: { type: Sequelize.INTEGER, allowNull: true },
      reference_invoice: { type: Sequelize.STRING(100), allowNull: true },
      payment_status: {
        type: Sequelize.ENUM("Outstanding", "Settled"),
        defaultValue: "Outstanding",
      },
      currency: { type: Sequelize.STRING(10), defaultValue: "INR" },
      notes: { type: Sequelize.TEXT, allowNull: true },
      subtotal: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("credit_notes", ["store_id", "date"]);
    await queryInterface.addIndex("credit_notes", ["store_id", "credit_note_number"], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("credit_notes");
  },
};
