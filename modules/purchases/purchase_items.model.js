const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseItem = sequelize.define(
    "PurchaseItem",
    {
      id:                 { type: DataTypes.INTEGER,        primaryKey: true, autoIncrement: true },
      purchase_id:        { type: DataTypes.INTEGER, allowNull: false, references: { model: "purchases", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      product_id:         { type: DataTypes.INTEGER, allowNull: false, references: { model: "products",  key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      variant_id:         { type: DataTypes.INTEGER, allowNull: true,  references: { model: "product_variants", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      product_name:       { type: DataTypes.STRING(200),    allowNull: false },
      quantity:           { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      unit_cost:          { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      discount_amount:    { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_rate:           { type: DataTypes.DECIMAL(5, 2),  defaultValue: 0.0 },
      tax_amount:         { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_cost:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      batch_number:       { type: DataTypes.STRING(100),    allowNull: true },
      manufacturing_date: { type: DataTypes.DATEONLY,       allowNull: true },
      expiry_date:        { type: DataTypes.DATEONLY,       allowNull: true },
    },
    {
      tableName: "purchase_items",
      underscored: true,
      timestamps: false,
      indexes: [
        { fields: ["purchase_id"] },
        { fields: ["product_id"] },
        { fields: ["variant_id"] },
      ],
    },
  );

  PurchaseItem.associate = (models) => {
    PurchaseItem.belongsTo(models.Purchase, { foreignKey: "purchase_id" });
    PurchaseItem.belongsTo(models.Product,  { foreignKey: "product_id" });
    PurchaseItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return PurchaseItem;
};
