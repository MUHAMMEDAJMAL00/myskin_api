const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Vendor = sequelize.define(
    "Vendor",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      company: { type: DataTypes.STRING(150) },
      email: { type: DataTypes.STRING(100) },
      phone: { type: DataTypes.STRING(20) },
      address: { type: DataTypes.TEXT },
      city: { type: DataTypes.STRING(100) },
      state: { type: DataTypes.STRING(100) },
      country: { type: DataTypes.STRING(100), defaultValue: "India" },
      postal_code: { type: DataTypes.STRING(20) },
      tax_number: { type: DataTypes.STRING(50) },
      opening_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      notes: { type: DataTypes.TEXT },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName: "vendors",
      underscored: true,
      
      paranoid: true,
    },
  );

  Vendor.associate = (models) => {
    Vendor.hasMany(models.Purchase, { foreignKey: "vendor_id" });
  };

  return Vendor;
};
