const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseReturn = sequelize.define(
    "PurchaseReturn",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      return_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      store_id:    { type: DataTypes.INTEGER, allowNull: false },
      vendor_id:   { type: DataTypes.INTEGER, allowNull: false },
      purchase_id: { type: DataTypes.INTEGER, allowNull: true },
      user_id:     { type: DataTypes.INTEGER, allowNull: false },
      return_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM("draft", "approved", "rejected", "completed", "cancelled"),
        defaultValue: "draft",
      },
      reason:        { type: DataTypes.STRING(255), allowNull: true },
      notes:         { type: DataTypes.TEXT, allowNull: true },
      subtotal:      { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_amount:    { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_amount:  { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      refund_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      refund_method: {
        type: DataTypes.ENUM("cash", "bank_transfer", "credit_note", "debit_note", "adjustment"),
        defaultValue: "adjustment",
      },
      refund_status: {
        type: DataTypes.ENUM("pending", "processed"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "purchase_returns",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
    },
  );

  PurchaseReturn.associate = function (models) {
    PurchaseReturn.belongsTo(models.Store,    { foreignKey: "store_id" });
    PurchaseReturn.belongsTo(models.Vendor,   { foreignKey: "vendor_id" });
    PurchaseReturn.belongsTo(models.Purchase, { foreignKey: "purchase_id" });
    PurchaseReturn.belongsTo(models.User,     { foreignKey: "user_id" });
    PurchaseReturn.hasMany(models.PurchaseReturnItem, {
      foreignKey: "purchase_return_id",
      as: "items",
    });
  };

  return PurchaseReturn;
};
