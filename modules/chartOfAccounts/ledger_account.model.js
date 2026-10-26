"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LedgerAccount = sequelize.define(
    "LedgerAccount",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      category_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    {
      tableName: "ledger_accounts",
      underscored: true,
      timestamps: true,
    },
  );

  LedgerAccount.associate = (models) => {
    LedgerAccount.belongsTo(models.Store, { foreignKey: "store_id" });
    LedgerAccount.belongsTo(models.AccountCategory, {
      foreignKey: "category_id",
      as: "category",
    });
    LedgerAccount.hasMany(models.JournalEntryLine, {
      foreignKey: "ledger_account_id",
      as: "journal_lines",
    });
  };

  return LedgerAccount;
};
