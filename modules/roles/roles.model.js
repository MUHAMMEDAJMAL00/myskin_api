const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Role = sequelize.define(
    "Role",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT },
    },
    {
      tableName: "roles",
      underscored: true,
      updatedAt: false,
    },
  );

  Role.associate = (models) => {
    Role.hasMany(models.User, { foreignKey: "role_id" });
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "role_id",
    });
  };

  return Role;
};
