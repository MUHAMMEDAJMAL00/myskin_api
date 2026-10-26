const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const VendorReturn = sequelize.define(
    "VendorReturn",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      vendor_id: { type: DataTypes.INTEGER, allowNull: false },
      product_id: { type: DataTypes.INTEGER, allowNull: false },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      purchase_id: { type: DataTypes.INTEGER, allowNull: true },
      quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      reason: { type: DataTypes.STRING(100), allowNull: false },
      notes: { type: DataTypes.TEXT },
      reference_number: { type: DataTypes.STRING(50) },
      return_action: {
        type: DataTypes.ENUM("refund", "replacement", "repair", "other"),
        defaultValue: "refund",
        allowNull: false,
      },
      refund_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      return_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "vendor_returns",
      underscored: true,
      timestamps: true,
    }
  );

  VendorReturn.associate = (models) => {
    VendorReturn.belongsTo(models.Vendor, { foreignKey: "vendor_id" });
    VendorReturn.belongsTo(models.Product, { foreignKey: "product_id" });
    VendorReturn.belongsTo(models.Store, { foreignKey: "store_id" });
    VendorReturn.belongsTo(models.User, { foreignKey: "user_id" });
    VendorReturn.belongsTo(models.Purchase, { foreignKey: "purchase_id" });
  };

  return VendorReturn;
};
