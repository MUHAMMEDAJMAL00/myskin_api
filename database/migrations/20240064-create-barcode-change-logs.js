"use strict";

/**
 * Migration: Create barcode_change_logs table
 *
 * Immutable audit trail for every barcode change on a product:
 * - adding a new barcode
 * - updating type / offer / validity
 * - deactivating (retiring) a barcode
 *
 * stock_at_change captures inventory snapshot at the time of change —
 * useful for "how much stock was under the old barcode" during migrations.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("barcode_change_logs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
        comment: "Store context for multi-store reporting",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },
      barcode_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "product_barcodes", key: "id" },
        onDelete: "SET NULL",
        comment: "FK to product_barcodes row (null if the row was hard-deleted)",
      },
      old_barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Previous barcode value (null for new additions)",
      },
      new_barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "New barcode value (null for deactivations)",
      },
      old_type: {
        type: Sequelize.ENUM("primary", "alternate", "promo"),
        allowNull: true,
        comment: "Barcode type before change",
      },
      new_type: {
        type: Sequelize.ENUM("primary", "alternate", "promo"),
        allowNull: true,
        comment: "Barcode type after change",
      },
      old_offer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Linked offer before change",
      },
      new_offer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Linked offer after change",
      },
      change_type: {
        type: Sequelize.ENUM("add", "update", "deactivate"),
        allowNull: false,
        comment: "Nature of the barcode change",
      },
      change_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Why was this change made (supplier change, promo end, migration, etc.)",
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        comment: "User who made the change",
      },
      stock_at_change: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: true,
        comment: "Inventory snapshot at the moment of change (per store)",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("barcode_change_logs", ["product_id"], {
      name: "idx_bcl_product_id",
    });
    await queryInterface.addIndex("barcode_change_logs", ["store_id"], {
      name: "idx_bcl_store_id",
    });
    await queryInterface.addIndex("barcode_change_logs", ["old_barcode"], {
      name: "idx_bcl_old_barcode",
    });
    await queryInterface.addIndex("barcode_change_logs", ["new_barcode"], {
      name: "idx_bcl_new_barcode",
    });
    await queryInterface.addIndex("barcode_change_logs", ["changed_by"], {
      name: "idx_bcl_changed_by",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("barcode_change_logs");
  },
};
