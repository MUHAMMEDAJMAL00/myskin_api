"use strict";

/**
 * Migration: Add per-bill purchase rules + offer trigger barcode to discounts
 *
 * single_use_per_bill  — offer fires at most once per transaction (already in UI, now persisted)
 * max_per_transaction  — hard cap on how many times offer can repeat per transaction
 * offer_stock_type     — regular stock vs separate promo-stock pool (UI already sends this)
 * offer_trigger_barcode— scanning this barcode at POS auto-activates the offer (UI already sends)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "discounts";
    const cols = await queryInterface.describeTable(table);

    if (!cols.single_use_per_bill) {
      await queryInterface.addColumn(table, "single_use_per_bill", {
        type: Sequelize.TINYINT(1),
        defaultValue: 0,
        allowNull: false,
        after: "bogo_max_times",
        comment: "1 = offer applies at most once per transaction regardless of eligible qty",
      });
    }

    if (!cols.max_per_transaction) {
      await queryInterface.addColumn(table, "max_per_transaction", {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: "single_use_per_bill",
        comment: "Max times this offer can trigger per transaction (null = unlimited)",
      });
    }

    if (!cols.offer_stock_type) {
      await queryInterface.addColumn(table, "offer_stock_type", {
        type: Sequelize.ENUM("regular", "offer_stock"),
        defaultValue: "regular",
        allowNull: false,
        after: "max_per_transaction",
        comment: "regular = deduct from main stock; offer_stock = track promo units separately",
      });
    }

    if (!cols.offer_trigger_barcode) {
      await queryInterface.addColumn(table, "offer_trigger_barcode", {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: "offer_stock_type",
        comment: "Scanning this barcode at POS auto-activates the offer",
      });
    }
  },

  async down(queryInterface) {
    const table = "discounts";
    const cols = await queryInterface.describeTable(table);

    for (const col of ["single_use_per_bill", "max_per_transaction", "offer_stock_type", "offer_trigger_barcode"]) {
      if (cols[col]) await queryInterface.removeColumn(table, col);
    }
  },
};
