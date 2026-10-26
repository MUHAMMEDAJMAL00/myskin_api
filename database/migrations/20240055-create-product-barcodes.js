"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("product_barcodes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("primary", "alternate", "promo"),
        defaultValue: "alternate",
      },
      is_active: {
        type: Sequelize.TINYINT,
        defaultValue: 1,
      },
      valid_from: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      valid_to: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("product_barcodes", ["barcode"], {
      name: "idx_product_barcodes_barcode",
    });
    await queryInterface.addIndex("product_barcodes", ["product_id"], {
      name: "idx_product_barcodes_product_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("product_barcodes");
  },
};
