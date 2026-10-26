const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ReturnItem = sequelize.define(
    "ReturnItem",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      return_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: "returns",    key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      sale_item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "sale_items", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      product_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: "products",   key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      variant_id:   { type: DataTypes.INTEGER, allowNull: true,  references: { model: "product_variants", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      product_name: { type: DataTypes.STRING(200), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      restock: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName: "return_items",
      underscored: true,
      timestamps: false,
      indexes: [
        { fields: ["return_id"] },
        { fields: ["product_id"] },
        { fields: ["sale_item_id"] },
        { fields: ["variant_id"] },
      ],
    },
  );

  ReturnItem.associate = (models) => {
    ReturnItem.belongsTo(models.Return, { foreignKey: "return_id" });
    ReturnItem.belongsTo(models.SaleItem, { foreignKey: "sale_item_id" });
    ReturnItem.belongsTo(models.Product, { foreignKey: "product_id" });
    ReturnItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
  };

  return ReturnItem;
};
