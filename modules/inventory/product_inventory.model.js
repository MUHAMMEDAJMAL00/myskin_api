const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProductInventory = sequelize.define(
    "ProductInventory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER, allowNull: false },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "product_variants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      quantity: { type: DataTypes.DECIMAL(12, 3), defaultValue: 0.0 },
      reserved_quantity: { type: DataTypes.DECIMAL(12, 3), defaultValue: 0.0 },
    },
    {
      tableName: "product_inventory",
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ["store_id", "product_id", "variant_id"] },
      ],
    },
  );

  ProductInventory.associate = (models) => {
    ProductInventory.belongsTo(models.Product, { foreignKey: "product_id" });
    ProductInventory.belongsTo(models.Store, { foreignKey: "store_id" });
    ProductInventory.belongsTo(models.ProductVariant, { foreignKey: "variant_id", as: "Variant" });
  };

  return ProductInventory;
};
