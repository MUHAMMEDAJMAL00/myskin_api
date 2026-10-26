"use strict";

const { DataTypes } = require("sequelize");

/**
 * OfferConflict Model
 * Defines rules for handling when multiple offers apply simultaneously
 *
 * Example:
 * - Offer A (20% off): Buy 5 items
 * - Offer B (30% off): Spend ₹500
 * - If both qualify, which wins? Priority = A? Or use best discount (B)?
 *
 * Conflict Rules:
 * 1. priority: Use the winning offer (offer_priority: 1 or 2)
 * 2. best_discount: Automatically select the one giving largest discount
 * 3. stacking: Apply both offers sequentially (only for non-conflicting types)
 */

module.exports = (sequelize) => {
  const OfferConflict = sequelize.define(
    "OfferConflict",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onDelete: "CASCADE",
      },

      offer_id_1: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "First offer",
      },

      offer_id_2: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "discounts", key: "id" },
        onDelete: "CASCADE",
        comment: "Second offer (conflicts with offer_id_1)",
      },

      conflict_rule: {
        type: DataTypes.ENUM("priority", "best_discount", "stacking"),
        defaultValue: "best_discount",
        allowNull: false,
        comment:
          "priority: use offer_priority; best_discount: calc largest discount; stacking: apply both",
      },

      offer_priority: {
        type: DataTypes.TINYINT,
        allowNull: true,
        validate: { min: 1, max: 2 },
        comment:
          "When rule=priority: 1 for offer_id_1, 2 for offer_id_2 (winner)",
      },

      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    {
      tableName: "offer_conflicts",
      underscored: true,
      timestamps: true,
    },
  );

  OfferConflict.associate = (models) => {
    OfferConflict.belongsTo(models.Discount, {
      foreignKey: "offer_id_1",
      as: "Offer1",
    });
    OfferConflict.belongsTo(models.Discount, {
      foreignKey: "offer_id_2",
      as: "Offer2",
    });
    OfferConflict.belongsTo(models.Store, {
      foreignKey: "store_id",
      as: "Store",
    });
  };

  return OfferConflict;
};
