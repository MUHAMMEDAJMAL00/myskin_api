"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sales");

    if (!table.invoice_tax_mode) {
      await queryInterface.addColumn("sales", "invoice_tax_mode", {
        type: Sequelize.STRING(20),
        defaultValue: "product",
        allowNull: false,
      });
    }
    if (!table.invoice_tax_group_id) {
      await queryInterface.addColumn("sales", "invoice_tax_group_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!table.invoice_tax_percentage) {
      await queryInterface.addColumn("sales", "invoice_tax_percentage", {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }
    if (!table.invoice_tax_amount) {
      await queryInterface.addColumn("sales", "invoice_tax_amount", {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("sales", "invoice_tax_mode");
    await queryInterface.removeColumn("sales", "invoice_tax_group_id");
    await queryInterface.removeColumn("sales", "invoice_tax_percentage");
    await queryInterface.removeColumn("sales", "invoice_tax_amount");
  },
};
