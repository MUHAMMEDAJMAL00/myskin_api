const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchasePayment = sequelize.define(
    "PurchasePayment",
    {
      id:               { type: DataTypes.INTEGER,        primaryKey: true, autoIncrement: true },
      purchase_id:      { type: DataTypes.INTEGER,        allowNull: false },
      payment_method:   { type: DataTypes.STRING(30),     allowNull: false },
      amount:           { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      reference_number: { type: DataTypes.STRING(100) },
      payment_date:     { type: DataTypes.DATE,           defaultValue: DataTypes.NOW },
      notes:            { type: DataTypes.TEXT },
    },
    {
      tableName: "purchase_payments",
      underscored: true,
      timestamps: false,
      indexes: [{ fields: ["purchase_id"] }],
    },
  );

  PurchasePayment.associate = (models) => {
    PurchasePayment.belongsTo(models.Purchase, { foreignKey: "purchase_id" });
  };

  return PurchasePayment;
};
