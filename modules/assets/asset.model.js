"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Asset = sequelize.define(
    "Asset",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      category: { type: DataTypes.STRING(100), allowNull: true },
      purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
      purchase_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      depreciation_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.0 },
      accumulated_depreciation: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      current_book_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("Active", "Disposed"),
        defaultValue: "Active",
      },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "assets",
      underscored: true,
      
      paranoid: true,
    },
  );

  Asset.associate = (models) => {
    Asset.belongsTo(models.Store, { foreignKey: "store_id" });
    Asset.belongsTo(models.User, { foreignKey: "created_by", as: "CreatedBy" });
  };

  return Asset;
};
