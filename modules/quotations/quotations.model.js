const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Quotation = sequelize.define(
    "Quotation",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      quotation_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      customer_id: { type: DataTypes.INTEGER },
      customer_name: { type: DataTypes.STRING(150) },
      quotation_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      valid_until: { type: DataTypes.DATEONLY },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected", "expired", "cancelled", "converted"),
        defaultValue: "pending",
      },
      subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      notes: { type: DataTypes.TEXT },
      converted_sale_id: { type: DataTypes.INTEGER },
    },
    {
      tableName: "quotations",
      underscored: true,
      
      paranoid: true,
    },
  );

  Quotation.associate = (models) => {
    Quotation.belongsTo(models.Store, { foreignKey: "store_id" });
    Quotation.belongsTo(models.User, { foreignKey: "user_id" });
    Quotation.belongsTo(models.Customer, { foreignKey: "customer_id" });
    Quotation.hasMany(models.QuotationItem, {
      foreignKey: "quotation_id",
      as: "items",
    });
    Quotation.belongsTo(models.Sale, {
      foreignKey: "converted_sale_id",
      as: "convertedSale",
    });
    Quotation.hasMany(models.QuotationVersion, {
      foreignKey: "quotation_id",
      as: "versions",
    });
  };

  return Quotation;
};
