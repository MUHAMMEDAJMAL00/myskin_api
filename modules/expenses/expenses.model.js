"use strict";
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const Expense = sequelize.define(
    "Expense",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      category_id: { type: DataTypes.INTEGER, allowNull: true },
      title: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payment_method: {
        type: DataTypes.ENUM("cash", "card", "upi", "bank", "other"),
        defaultValue: "cash",
      },
      reference_number: { type: DataTypes.STRING(100), allowNull: true },
      expense_date: { type: DataTypes.DATEONLY, allowNull: false },
      receipt_url: { type: DataTypes.STRING(255), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "approved",
      },
      is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    },
    {
      tableName: "expenses",
      underscored: true,
      
      paranoid: true,
      indexes: [
        { fields: ["store_id", "expense_date"] },
        { fields: ["store_id", "category_id"] },
        { fields: ["store_id", "status"] },
      ],
    },
  );

  Expense.associate = (models) => {
    Expense.belongsTo(models.Store, { foreignKey: "store_id" });
    Expense.belongsTo(models.User, { foreignKey: "user_id" });
    Expense.belongsTo(models.ExpenseCategory, {
      foreignKey: "category_id",
      as: "category",
    });
  };
  return Expense;
};
