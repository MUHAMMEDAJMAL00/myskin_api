"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RecurringJE = sequelize.define(
    "RecurringJE",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      frequency: {
        type: DataTypes.ENUM("daily", "weekly", "monthly", "yearly"),
        allowNull: false,
        defaultValue: "monthly",
      },
      day_of_month: { type: DataTypes.INTEGER, allowNull: true },
      day_of_week: { type: DataTypes.INTEGER, allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      next_run_date: { type: DataTypes.DATEONLY, allowNull: false },
      last_run_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "recurring_journal_entries",
      underscored: true,
      paranoid: true,
    },
  );

  RecurringJE.associate = (models) => {
    RecurringJE.belongsTo(models.Store, { foreignKey: "store_id" });
    RecurringJE.belongsTo(models.User, { foreignKey: "created_by", as: "CreatedBy" });
    RecurringJE.hasMany(models.RecurringJELine, { foreignKey: "recurring_je_id", as: "lines" });
  };

  return RecurringJE;
};
