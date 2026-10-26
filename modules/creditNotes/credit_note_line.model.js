"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CreditNoteLine = sequelize.define(
    "CreditNoteLine",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      credit_note_id: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: false },
      qty: { type: DataTypes.DECIMAL(12, 3), defaultValue: 1 },
      rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
    },
    {
      tableName: "credit_note_lines",
      underscored: true,
      timestamps: false,
      indexes: [{ fields: ["credit_note_id"] }],
    },
  );

  CreditNoteLine.associate = (models) => {
    CreditNoteLine.belongsTo(models.CreditNote, { foreignKey: "credit_note_id" });
  };

  return CreditNoteLine;
};
