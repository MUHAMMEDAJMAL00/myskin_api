"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: { type: DataTypes.INTEGER },
      user_id: { type: DataTypes.INTEGER },
      type: {
        type: DataTypes.ENUM(
          "low_stock",
          "payment_due",
          "cash_register",
          "system",
        ),
        allowNull: false,
      },
      title: { type: DataTypes.STRING(150), allowNull: false },
      message: { type: DataTypes.TEXT },
      reference_type: { type: DataTypes.STRING(50) },
      reference_id: { type: DataTypes.INTEGER },
      is_read: { type: DataTypes.TINYINT(1), defaultValue: 0 },
    },
    {
      tableName: "notifications",
      underscored: true,
    },
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.Store, { foreignKey: "store_id" });
    Notification.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return Notification;
};
