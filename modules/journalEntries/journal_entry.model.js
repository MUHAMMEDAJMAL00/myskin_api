"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const JournalEntry = sequelize.define(
    "JournalEntry",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      reference_number: { type: DataTypes.STRING(50), allowNull: true },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      reference_type: { type: DataTypes.STRING(60), allowNull: true },
      reference_id: { type: DataTypes.INTEGER, allowNull: true },
      is_manual: { type: DataTypes.TINYINT(1), defaultValue: 0 },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "journal_entries",
      underscored: true,
      
      paranoid: true,
    },
  );

  JournalEntry.associate = (models) => {
    JournalEntry.belongsTo(models.Store, { foreignKey: "store_id" });
    JournalEntry.belongsTo(models.User, { foreignKey: "created_by", as: "CreatedBy" });
    JournalEntry.hasMany(models.JournalEntryLine, {
      foreignKey: "journal_entry_id",
      as: "lines",
    });
  };

  return JournalEntry;
};
