const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SaleItem = sequelize.define(
    "SaleItem",
    {
      id:             { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
      sale_id:        { type: DataTypes.INTEGER, allowNull: false, references: { model: "sales", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      product_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: "products", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      variant_id:     { type: DataTypes.INTEGER, allowNull: true,  references: { model: "product_variants", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      product_name:   { type: DataTypes.STRING(200),   allowNull: false },
      product_sku:    { type: DataTypes.STRING(100) },
      quantity:       { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      unit_price:     { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      discount_type:  { type: DataTypes.STRING(10),    defaultValue: "none" },
      discount_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
      discount_amount:{ type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_rate:       { type: DataTypes.DECIMAL(5, 2),  defaultValue: 0.0 },
      tax_amount:      { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      purchase_price:  { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_price:     { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    {
      tableName: "sale_items",
      underscored: true,
      timestamps: false,
      indexes: [
        { fields: ["sale_id"] },
        { fields: ["product_id"] },
        { fields: ["variant_id"] },
      ],
    },
  );

  SaleItem.associate = (models) => {
    SaleItem.belongsTo(models.Sale,    { foreignKey: "sale_id" });
    SaleItem.belongsTo(models.Product, { foreignKey: "product_id" });
    SaleItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return SaleItem;
};
