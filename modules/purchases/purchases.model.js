const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Purchase = sequelize.define(
    "Purchase",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      vendor_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      purchase_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM("received", "pending", "cancelled"),
        defaultValue: "received",
      },
      subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      shipping_charge: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      paid_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      due_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      payment_status: {
        type: DataTypes.ENUM("unpaid", "paid", "partial"),
        defaultValue: "unpaid",
      },
      reference_number: { type: DataTypes.STRING(100) },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "purchases",
      underscored: true,
      
      paranoid: true,
      indexes: [
        { fields: ["store_id", "purchase_date"] },
        { fields: ["store_id", "status"] },
        { fields: ["vendor_id"] },
        { fields: ["purchase_number"], unique: true },
      ],
    },
  );

  Purchase.associate = (models) => {
    Purchase.belongsTo(models.Store, { foreignKey: "store_id" });
    Purchase.belongsTo(models.Vendor, { foreignKey: "vendor_id" });
    Purchase.belongsTo(models.User, { foreignKey: "user_id" });
    Purchase.hasMany(models.PurchaseItem, {
      foreignKey: "purchase_id",
      as: "items",
    });
    Purchase.hasMany(models.PurchasePayment, {
      foreignKey: "purchase_id",
      as: "payments",
    });
  };

  return Purchase;
};
