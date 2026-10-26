"use strict";
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const ExpenseCategory = sequelize.define(
    "ExpenseCategory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    { tableName: "expense_categories", underscored: true, timestamps: true },
  );

  ExpenseCategory.associate = (models) => {
    ExpenseCategory.belongsTo(models.Store, { foreignKey: "store_id" });
    ExpenseCategory.hasMany(models.Expense, {
      foreignKey: "category_id",
      as: "expenses",
    });
  };
  return ExpenseCategory;
};
