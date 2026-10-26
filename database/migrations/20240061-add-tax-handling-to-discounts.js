"use strict";

/**
 * Migration: Add tax_handling field to discounts
 * Specifies whether discount applies before or after tax calculation
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "discounts";
    const cols = await queryInterface.describeTable(table);

    if (!cols.tax_handling) {
      await queryInterface.addColumn(table, "tax_handling", {
        type: Sequelize.ENUM("before_discount", "after_discount"),
        defaultValue: "before_discount",
        allowNull: false,
        after: "is_active",
        comment:
          "Tax calculation rule: before_discount (standard), after_discount (discount on tax-inclusive price)",
      });
    }
  },

  async down(queryInterface) {
    const table = "discounts";
    const cols = await queryInterface.describeTable(table);

    if (cols.tax_handling) {
      await queryInterface.removeColumn(table, "tax_handling");
    }
  },
};
