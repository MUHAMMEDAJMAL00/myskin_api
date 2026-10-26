const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StockMovement = sequelize.define(
    "StockMovement",
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
      user_id: { type: DataTypes.INTEGER },
      movement_type: { type: DataTypes.STRING(30), allowNull: false },
      reference_type: { type: DataTypes.STRING(30) },
      reference_id: { type: DataTypes.INTEGER },
      quantity_before: { type: DataTypes.DECIMAL(12, 3) },
      quantity_change: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      quantity_after: { type: DataTypes.DECIMAL(12, 3) },
      batch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "product_batches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      is_backorder: { type: DataTypes.TINYINT(1), defaultValue: 0 },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "stock_movements",
      underscored: true,
      updatedAt: false,
      paranoid: true,
      deletedAt: "deleted_at",
    },
  );

  StockMovement.associate = (models) => {
    StockMovement.belongsTo(models.Product, { foreignKey: "product_id" });
    StockMovement.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
    StockMovement.belongsTo(models.Store, { foreignKey: "store_id" });
    StockMovement.belongsTo(models.User, { foreignKey: "user_id" });
    StockMovement.belongsTo(models.ProductBatch, { foreignKey: "batch_id", as: "Batch" });
  };

  return StockMovement;
};
