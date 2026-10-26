"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SupplierPayment = sequelize.define(
    "SupplierPayment",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: { type: DataTypes.INTEGER },
      vendor_id: { type: DataTypes.INTEGER, allowNull: false },
      purchase_id: { type: DataTypes.INTEGER },
      user_id: { type: DataTypes.INTEGER },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payment_method: { type: DataTypes.STRING(30), allowNull: false },
      reference_number: { type: DataTypes.STRING(100) },
      notes: { type: DataTypes.TEXT },
      payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "supplier_payments",
      underscored: true,
    },
  );

  SupplierPayment.associate = (models) => {
    SupplierPayment.belongsTo(models.Vendor, { foreignKey: "vendor_id" });
    SupplierPayment.belongsTo(models.Purchase, { foreignKey: "purchase_id" });
    SupplierPayment.belongsTo(models.User, { foreignKey: "user_id" });
    SupplierPayment.belongsTo(models.Store, { foreignKey: "store_id" });
  };

  return SupplierPayment;
};
