const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const QuotationItem = sequelize.define(
    "QuotationItem",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      quotation_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "quotations", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      product_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: "products",   key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      variant_id:   { type: DataTypes.INTEGER, allowNull: true,  references: { model: "product_variants", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      product_name: { type: DataTypes.STRING(200), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.0 },
      tax_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    {
      tableName: "quotation_items",
      underscored: true,
      timestamps: false,
      indexes: [
        { fields: ["quotation_id"] },
        { fields: ["product_id"] },
        { fields: ["variant_id"] },
      ],
    },
  );

  QuotationItem.associate = (models) => {
    QuotationItem.belongsTo(models.Quotation, { foreignKey: "quotation_id" });
    QuotationItem.belongsTo(models.Product, { foreignKey: "product_id" });
    QuotationItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return QuotationItem;
};
