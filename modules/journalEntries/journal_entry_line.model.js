"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const JournalEntryLine = sequelize.define(
    "JournalEntryLine",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      journal_entry_id:  { type: DataTypes.INTEGER, allowNull: false, references: { model: "journal_entries", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      ledger_account_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "ledger_accounts",  key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: "journal_entry_lines",
      underscored: true,
      timestamps: false,
      indexes: [
        { fields: ["journal_entry_id"] },
        { fields: ["ledger_account_id"] },
      ],
    },
  );

  JournalEntryLine.associate = (models) => {
    JournalEntryLine.belongsTo(models.JournalEntry, { foreignKey: "journal_entry_id" });
    JournalEntryLine.belongsTo(models.LedgerAccount, {
      foreignKey: "ledger_account_id",
      as: "ledger_account",
    });
  };

  return JournalEntryLine;
};
