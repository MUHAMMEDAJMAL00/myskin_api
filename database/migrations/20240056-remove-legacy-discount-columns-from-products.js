"use strict";

/**
 * Removes the legacy `discount_type` and `discount_value` columns from the
 * `products` table. All discount logic now flows through `products.discount_id`
 * (FK to the discounts table). Run ONLY after verifying no code reads these
 * columns directly from product rows.
 *
 * Run with: npx sequelize db:migrate
 */

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeColumn("products", "discount_type");
    await queryInterface.removeColumn("products", "discount_value");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("products", "discount_type", {
      type: Sequelize.STRING(10),
      defaultValue: "none",
      after: "tax_included",
    });
    await queryInterface.addColumn("products", "discount_value", {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.0,
      after: "discount_type",
    });
  },
};
