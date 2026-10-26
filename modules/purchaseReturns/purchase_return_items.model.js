const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseReturnItem = sequelize.define(
    "PurchaseReturnItem",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_return_id: { type: DataTypes.INTEGER, allowNull: false },
      product_id:         { type: DataTypes.INTEGER, allowNull: false },
      variant_id:         { type: DataTypes.INTEGER, allowNull: true, references: { model: "product_variants", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      purchase_item_id:   { type: DataTypes.INTEGER, allowNull: true },
      quantity:     { type: DataTypes.DECIMAL(10, 3), allowNull: false },
      unit_price:   { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_rate:     { type: DataTypes.DECIMAL(5, 2),  defaultValue: 0.0 },
      tax_amount:   { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      reason:       { type: DataTypes.STRING(255),    allowNull: true },
    },
    {
      tableName: "purchase_return_items",
      timestamps: false,
      indexes: [
        { fields: ["purchase_return_id"] },
        { fields: ["product_id"] },
        { fields: ["variant_id"] },
      ],
    },
  );

  PurchaseReturnItem.associate = function (models) {
    PurchaseReturnItem.belongsTo(models.PurchaseReturn, {
      foreignKey: "purchase_return_id",
    });
    PurchaseReturnItem.belongsTo(models.Product, { foreignKey: "product_id" });
    PurchaseReturnItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return PurchaseReturnItem;
};
