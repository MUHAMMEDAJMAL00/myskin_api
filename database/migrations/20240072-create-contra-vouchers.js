"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("contra_vouchers", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      voucher_number: { type: Sequelize.STRING(50), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      from_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ledger_accounts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      to_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ledger_accounts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      payment_mode: { type: Sequelize.STRING(30), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("contra_vouchers", ["store_id", "date"]);
    await queryInterface.addIndex("contra_vouchers", ["store_id", "voucher_number"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("contra_vouchers");
  },
};
