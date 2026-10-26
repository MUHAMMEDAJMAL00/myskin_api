"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RecurringJELine = sequelize.define(
    "RecurringJELine",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      recurring_je_id: { type: DataTypes.INTEGER, allowNull: false },
      ledger_account_id: { type: DataTypes.INTEGER, allowNull: false },
      debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: "recurring_je_lines",
      underscored: true,
    },
  );

  RecurringJELine.associate = (models) => {
    RecurringJELine.belongsTo(models.RecurringJE, { foreignKey: "recurring_je_id", onDelete: "CASCADE" });
    RecurringJELine.belongsTo(models.LedgerAccount, { foreignKey: "ledger_account_id", as: "ledger_account" });
  };

  return RecurringJELine;
};
