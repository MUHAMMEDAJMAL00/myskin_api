"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DiscountTier = sequelize.define(
    "DiscountTier",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      discount_id: { type: DataTypes.INTEGER, allowNull: false },

      min_quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        comment: "Min qty to trigger this tier",
      },

      max_quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: "Max qty for this tier (null = no upper limit)",
      },

      discount_type: {
        type: DataTypes.ENUM("flat", "percent"),
        allowNull: false,
      },

      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      tableName: "discount_tiers",
      underscored: true,
      timestamps: true,
    },
  );

  DiscountTier.associate = (models) => {
    DiscountTier.belongsTo(models.Discount, { foreignKey: "discount_id" });
  };

  return DiscountTier;
};
