"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AccountCategory = sequelize.define(
    "AccountCategory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      group: {
        type: DataTypes.ENUM("Asset", "Liability", "Expenditure", "Income", "Equity"),
        allowNull: false,
      },
      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    {
      tableName: "account_categories",
      underscored: true,
      timestamps: true,
    },
  );

  AccountCategory.associate = (models) => {
    AccountCategory.belongsTo(models.Store, { foreignKey: "store_id" });
    AccountCategory.hasMany(models.LedgerAccount, {
      foreignKey: "category_id",
      as: "ledger_accounts",
    });
  };

  return AccountCategory;
};
