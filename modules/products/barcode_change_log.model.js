"use strict";

const { DataTypes } = require("sequelize");

/**
 * BarcodeChangeLog — immutable audit trail for barcode changes.
 *
 * Every time a barcode is added, updated, or deactivated on a product,
 * a row is inserted here.  stock_at_change captures a point-in-time
 * inventory snapshot so old-barcode stock can be identified for migration.
 */
module.exports = (sequelize) => {
  const BarcodeChangeLog = sequelize.define(
    "BarcodeChangeLog",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Store context",
      },

      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Product whose barcode changed",
      },

      barcode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "FK to product_barcodes (null if row was hard-deleted)",
      },

      old_barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Barcode value before change (null for add operations)",
      },

      new_barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Barcode value after change (null for deactivate operations)",
      },

      old_type: {
        type: DataTypes.ENUM("primary", "alternate", "promo"),
        allowNull: true,
      },

      new_type: {
        type: DataTypes.ENUM("primary", "alternate", "promo"),
        allowNull: true,
      },

      old_offer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Offer linked to barcode before change",
      },

      new_offer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Offer linked to barcode after change",
      },

      change_type: {
        type: DataTypes.ENUM("add", "update", "deactivate"),
        allowNull: false,
        comment: "Nature of the barcode change",
      },

      change_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Why this change was made (supplier change, promo end, migration, etc.)",
      },

      changed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User ID of the operator who made the change",
      },

      stock_at_change: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: true,
        comment: "Inventory quantity snapshot at time of change (for migration planning)",
      },
    },
    {
      tableName: "barcode_change_logs",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );

  BarcodeChangeLog.associate = (models) => {
    BarcodeChangeLog.belongsTo(models.Store,          { foreignKey: "store_id" });
    BarcodeChangeLog.belongsTo(models.Product,        { foreignKey: "product_id" });
    BarcodeChangeLog.belongsTo(models.ProductBarcode, { foreignKey: "barcode_id", as: "BarcodeRow", constraints: false });
    BarcodeChangeLog.belongsTo(models.User,           { foreignKey: "changed_by", as: "ChangedBy" });
  };

  return BarcodeChangeLog;
};
