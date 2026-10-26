"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ContraVoucher = sequelize.define(
    "ContraVoucher",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      voucher_number: { type: DataTypes.STRING(50), allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      from_account_id: { type: DataTypes.INTEGER, allowNull: false },
      to_account_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      payment_mode: { type: DataTypes.STRING(30), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "contra_vouchers",
      underscored: true,
      
      paranoid: true,
    },
  );

  ContraVoucher.associate = (models) => {
    ContraVoucher.belongsTo(models.Store, { foreignKey: "store_id" });
    ContraVoucher.belongsTo(models.LedgerAccount, { foreignKey: "from_account_id", as: "from_account" });
    ContraVoucher.belongsTo(models.LedgerAccount, { foreignKey: "to_account_id", as: "to_account" });
    ContraVoucher.belongsTo(models.User, { foreignKey: "created_by", as: "CreatedBy" });
  };

  return ContraVoucher;
};
