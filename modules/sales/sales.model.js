const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Sale = sequelize.define(
    "Sale",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      invoice_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      customer_id: { type: DataTypes.INTEGER },
      quotation_id: { type: DataTypes.INTEGER },
      sale_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM("completed", "pending", "cancelled", "returned", "partial_return", "confirmed", "processing", "shipped", "delivered"),
        defaultValue: "completed",
      },
      source: { type: DataTypes.STRING(20), defaultValue: "pos" },
      subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      discount_type: { type: DataTypes.STRING(10), defaultValue: "none" },
      discount_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
      discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      shipping_charge: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      round_off: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.0 },
      total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      total_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      paid_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      due_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      payment_status: {
        type: DataTypes.ENUM("unpaid", "paid", "partial", "refunded"),
        defaultValue: "unpaid",
      },
      notes: { type: DataTypes.TEXT },
      invoice_tax_mode: { type: DataTypes.STRING(20), defaultValue: "product" },
      invoice_tax_group_id: { type: DataTypes.INTEGER, allowNull: true },
      invoice_tax_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      invoice_tax_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    },
    {
      tableName: "sales",
      underscored: true,
      
      paranoid: true,
      indexes: [
        { fields: ["store_id", "sale_date"] },
        { fields: ["store_id", "status"] },
        { fields: ["store_id", "payment_status"] },
        { fields: ["customer_id"] },
        { fields: ["invoice_number"], unique: true },
      ],
    },
  );

  Sale.associate = (models) => {
    Sale.belongsTo(models.Store, { foreignKey: "store_id" });
    Sale.belongsTo(models.User, { foreignKey: "user_id" });
    Sale.belongsTo(models.Customer, { foreignKey: "customer_id" });
    Sale.belongsTo(models.TaxGroup, { foreignKey: "invoice_tax_group_id", as: "TaxGroup" });
    Sale.hasMany(models.SaleItem, { foreignKey: "sale_id", as: "items" });
    Sale.hasMany(models.SalePayment, { foreignKey: "sale_id", as: "payments" });
    Sale.hasMany(models.Return, { foreignKey: "sale_id" });
  };

  return Sale;
};
