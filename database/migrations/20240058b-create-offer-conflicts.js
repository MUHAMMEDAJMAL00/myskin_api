"use strict";

/**
 * Migration: Create offer_conflicts table
 * Tracks conflict resolution rules when multiple offers apply
 * Supports priority, best discount, and stacking policies
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("offer_conflicts", {
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
      },
      offer_id_1: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "First offer",
      },
      offer_id_2: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "Second offer (can conflict with offer_id_1)",
      },
      conflict_rule: {
        type: Sequelize.ENUM("priority", "best_discount", "stacking"),
        defaultValue: "best_discount",
        allowNull: false,
        comment:
          "How to resolve: priority (use offer_priority), best_discount (largest discount), stacking (apply both)",
      },
      offer_priority: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "When conflict_rule=priority, which offer wins (1=first, 2=second)",
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("offer_conflicts", ["store_id"], {
      name: "idx_offer_conflicts_store_id",
    });
    await queryInterface.addIndex(
      "offer_conflicts",
      ["offer_id_1", "offer_id_2"],
      { name: "idx_offer_conflicts_unique" },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeTable("offer_conflicts");
  },
};
