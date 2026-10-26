"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("product_batches", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "stores",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      batch_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      purchase_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "purchases",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      manufacturing_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      purchase_rate: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      selling_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      initial_quantity: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.0,
      },
      current_quantity: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.0,
      },
      is_active: {
        type: Sequelize.TINYINT,
        defaultValue: 1,
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

    await queryInterface.addIndex("product_batches", ["product_id", "store_id", "batch_number"], {
      unique: true,
      name: "unique_batch_per_product_store",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("product_batches");
  },
};
