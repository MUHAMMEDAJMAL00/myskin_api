"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DebitNote = sequelize.define(
    "DebitNote",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      debit_note_number: { type: DataTypes.STRING(50), allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      vendor_id: { type: DataTypes.INTEGER, allowNull: true },
      reference_bill: { type: DataTypes.STRING(100), allowNull: true },
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
      tableName: "debit_notes",
      underscored: true,
      
      paranoid: true,
    },
  );

  DebitNote.associate = (models) => {
    DebitNote.belongsTo(models.Store, { foreignKey: "store_id" });
    DebitNote.belongsTo(models.Vendor, { foreignKey: "vendor_id", as: "vendor" });
    DebitNote.belongsTo(models.User, { foreignKey: "created_by", as: "CreatedBy" });
    DebitNote.hasMany(models.DebitNoteLine, { foreignKey: "debit_note_id", as: "lines" });
  };

  return DebitNote;
};
