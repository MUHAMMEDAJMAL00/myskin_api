"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      store_id: { type: DataTypes.INTEGER },
      user_id: { type: DataTypes.INTEGER },
      module: { type: DataTypes.STRING(50), allowNull: false },
      action: { type: DataTypes.STRING(50), allowNull: false },
      reference_type: { type: DataTypes.STRING(50) },
      reference_id: { type: DataTypes.INTEGER },
      old_values: { type: DataTypes.TEXT },
      new_values: { type: DataTypes.TEXT },
      ip_address: { type: DataTypes.STRING(50) },
      user_agent: { type: DataTypes.STRING(255) },
    },
    {
      tableName: "audit_logs",
      underscored: true,
      updatedAt: false,
      paranoid: true,
      deletedAt: "deleted_at",
    },
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: "user_id" });
    AuditLog.belongsTo(models.Store, { foreignKey: "store_id" });
  };

  return AuditLog;
};
