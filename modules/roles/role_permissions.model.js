const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: { type: DataTypes.INTEGER, allowNull: false },
      permission_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "role_permissions",
      underscored: true,
      timestamps: false,
    },
  );

  return RolePermission;
};
