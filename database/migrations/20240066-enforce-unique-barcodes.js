"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex("product_barcodes", "idx_product_barcodes_barcode").catch(() => {});
    await queryInterface.addIndex("product_barcodes", ["barcode"], {
      name: "uk_product_barcodes_barcode",
      unique: true,
    });

    await queryInterface.removeIndex("product_variants", "idx_product_variants_barcode").catch(() => {});
    await queryInterface.addIndex("product_variants", ["barcode"], {
      name: "uk_product_variants_barcode",
      unique: true,
    }).catch(() => {});

    await queryInterface.addIndex("products", ["barcode"], {
      name: "uk_products_barcode",
      unique: true,
    }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("product_barcodes", "uk_product_barcodes_barcode").catch(() => {});
    await queryInterface.addIndex("product_barcodes", ["barcode"], {
      name: "idx_product_barcodes_barcode",
    }).catch(() => {});
    await queryInterface.removeIndex("product_variants", "uk_product_variants_barcode").catch(() => {});
    await queryInterface.removeIndex("products", "uk_products_barcode").catch(() => {});
  },
};
