"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProductBarcode = sequelize.define(
    "ProductBarcode",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER, allowNull: false },

      barcode: { type: DataTypes.STRING(100), allowNull: false },

      type: {
        type: DataTypes.ENUM("primary", "alternate", "promo"),
        defaultValue: "alternate",
        comment: "primary = main barcode; alternate = supplier/secondary; promo = time-limited campaign barcode",
      },

      /* FK to discounts — scanning this barcode at POS auto-applies the linked offer */
      offer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "If set, scanning this barcode auto-triggers the linked offer",
      },

      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },

      valid_from: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "For promo barcodes: earliest date it is valid",
      },
      valid_to: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "For promo barcodes: last date it is valid (null = no expiry)",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Why this barcode was added (supplier info, promo description, migration note)",
      },
    },
    {
      tableName: "product_barcodes",
      underscored: true,
      timestamps: true,
    },
  );

  ProductBarcode.associate = (models) => {
    ProductBarcode.belongsTo(models.Product, {
      foreignKey: "product_id",
      as: "Product",
    });
    /* Offer linked to this specific barcode — scanned barcode → auto-trigger offer */
    ProductBarcode.belongsTo(models.Discount, {
      foreignKey: "offer_id",
      as: "Offer",
      constraints: false,
    });
  };

  return ProductBarcode;
};
