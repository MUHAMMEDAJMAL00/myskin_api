"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DebitNoteLine = sequelize.define(
    "DebitNoteLine",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      debit_note_id: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: false },
      qty: { type: DataTypes.DECIMAL(12, 3), defaultValue: 1 },
      rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
      amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.0 },
    },
    {
      tableName: "debit_note_lines",
      underscored: true,
      timestamps: false,
      indexes: [{ fields: ["debit_note_id"] }],
    },
  );

  DebitNoteLine.associate = (models) => {
    DebitNoteLine.belongsTo(models.DebitNote, { foreignKey: "debit_note_id" });
  };

  return DebitNoteLine;
};
