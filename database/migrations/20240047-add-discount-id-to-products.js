"use strict";

/**
 * Migration: Add discount_id FK to products
 *
 * This links a product to a specific Discount from the discounts module.
 * At checkout, POS reads product.discount_id to auto-suggest the promo.
 * NULL = no default discount linked.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("products");

    if (!tableDesc.discount_id) {
      await queryInterface.addColumn("products", "discount_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: "FK to discounts.id — default promo linked to this product",
        after: "discount_value", // places it next to the old discount fields
      });

      await queryInterface.addIndex("products", ["discount_id"], {
        name: "idx_products_discount_id",
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable("products");
    if (tableDesc.discount_id) {
      await queryInterface.removeIndex("products", "idx_products_discount_id");
      await queryInterface.removeColumn("products", "discount_id");
    }
  },
};
