const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Wastage = sequelize.define(
    "Wastage",
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
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      reason: { type: DataTypes.STRING(100), allowNull: false }, // damaged, expired, lost, etc
      notes: { type: DataTypes.TEXT },
      reference_number: { type: DataTypes.STRING(50) },
      wastage_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "wastages",
      underscored: true,
      timestamps: true,
    }
  );

  Wastage.associate = (models) => {
    Wastage.belongsTo(models.Product, { foreignKey: "product_id" });
    Wastage.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
    Wastage.belongsTo(models.Store, { foreignKey: "store_id" });
    Wastage.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return Wastage;
};
