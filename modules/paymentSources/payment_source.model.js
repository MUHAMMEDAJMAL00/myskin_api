const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PaymentSource = sequelize.define(
    "PaymentSource",
    {
      id:            { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
      name:          { type: DataTypes.STRING(80),  allowNull: false },
      type:          { type: DataTypes.ENUM("cash", "upi", "card", "bank", "other"), allowNull: false },
      icon:          { type: DataTypes.STRING(60),  allowNull: true },
      is_active:     { type: DataTypes.BOOLEAN,     defaultValue: true },
      display_order: { type: DataTypes.INTEGER,     defaultValue: 0 },
      notes:         { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: "payment_sources",
      underscored: true,
      timestamps: true,
    },
  );

  return PaymentSource;
};
