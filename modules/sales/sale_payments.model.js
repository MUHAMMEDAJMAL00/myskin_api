const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SalePayment = sequelize.define(
    "SalePayment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sale_id: { type: DataTypes.INTEGER, allowNull: false },
      payment_method: { type: DataTypes.STRING(30), allowNull: false },
      payment_source_name: { type: DataTypes.STRING(80), allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      reference_number: { type: DataTypes.STRING(100) },
      payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "sale_payments",
      underscored: true,
      timestamps: false,
      indexes: [{ fields: ["sale_id"] }],
    },
  );

  SalePayment.associate = (models) => {
    SalePayment.belongsTo(models.Sale, { foreignKey: "sale_id" });
  };

  return SalePayment;
};
