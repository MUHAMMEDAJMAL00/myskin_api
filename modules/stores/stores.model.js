const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Store = sequelize.define(
    "Store",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      address: { type: DataTypes.TEXT },
      phone: { type: DataTypes.STRING(20) },
      email: { type: DataTypes.STRING(100) },
      currency: { type: DataTypes.STRING(10), defaultValue: "INR" },
      timezone: { type: DataTypes.STRING(50), defaultValue: "Asia/Kolkata" },
      allow_negative_stock: { type: DataTypes.TINYINT(1), defaultValue: 0 },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName: "stores",
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  Store.associate = (models) => {
    Store.hasMany(models.User, { foreignKey: "store_id" });
    Store.hasMany(models.Sale, { foreignKey: "store_id" });
    Store.hasMany(models.Purchase, { foreignKey: "store_id" });
    Store.hasMany(models.ProductInventory, { foreignKey: "store_id" });
    Store.hasMany(models.StockMovement, { foreignKey: "store_id" });
  };

  return Store;
};
