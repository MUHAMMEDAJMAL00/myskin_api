"use strict";

/**
 * Migration: Link product_barcodes to discounts
 *
 * offer_id  — scanning this barcode at POS auto-triggers the linked offer
 * notes     — free-text reason for why the barcode was added (supplier note, promo desc, etc.)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "product_barcodes";
    const cols = await queryInterface.describeTable(table);

    if (!cols.offer_id) {
      await queryInterface.addColumn(table, "offer_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "discounts", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        after: "valid_to",
        comment: "When this barcode is scanned the linked offer is auto-applied at POS",
      });
    }

    if (!cols.notes) {
      await queryInterface.addColumn(table, "notes", {
        type: Sequelize.TEXT,
        allowNull: true,
        after: "offer_id",
        comment: "Reason this barcode was added (supplier info, promo description, etc.)",
      });
    }
  },

  async down(queryInterface) {
    const table = "product_barcodes";
    const cols = await queryInterface.describeTable(table);

    if (cols.offer_id) await queryInterface.removeColumn(table, "offer_id");
    if (cols.notes)    await queryInterface.removeColumn(table, "notes");
  },
};
