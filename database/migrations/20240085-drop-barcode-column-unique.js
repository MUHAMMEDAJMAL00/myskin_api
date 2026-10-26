"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex("products", "barcode").catch(() => {});
    await queryInterface.removeIndex("product_variants", "barcode").catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.addIndex("products", ["barcode"], { name: "barcode", unique: true }).catch(() => {});
    await queryInterface.addIndex("product_variants", ["barcode"], { name: "barcode", unique: true }).catch(() => {});
  },
};
