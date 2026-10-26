"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CreditNote = sequelize.define(
    "CreditNote",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      credit_note_number: { type: DataTypes.STRING(50), allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      customer_id: { type: DataTypes.INTEGER, allowNull: true },
      reference_invoice: { type: DataTypes.STRING(100), allowNull: true },
      payment_status: {
        type: DataTypes.ENUM("Outstanding", "Settled"),
        defaultValue: "Outstanding",
      },
      currency: { type: DataTypes.STRING(10), defaultValue: "INR" },
      notes: { type: DataTypes.TEXT, allowNull: true },
      subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "credit_notes",
      underscored: true,
      
      paranoid: true,
    },
  );

  CreditNote.associate = (models) => {
    CreditNote.belongsTo(models.Store, { foreignKey: "store_id" });
    CreditNote.belongsTo(models.Customer, { foreignKey: "customer_id", as: "customer" });
    CreditNote.belongsTo(models.User, { foreignKey: "created_by", as: "CreatedBy" });
    CreditNote.hasMany(models.CreditNoteLine, { foreignKey: "credit_note_id", as: "lines" });
  };

  return CreditNote;
};
