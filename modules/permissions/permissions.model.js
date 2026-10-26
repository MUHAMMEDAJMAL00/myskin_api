const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      module: { type: DataTypes.STRING(50), allowNull: false },
      action: { type: DataTypes.STRING(50), allowNull: false },
      description: { type: DataTypes.TEXT },
    },
    {
      tableName: "permissions",
      underscored: true,
      timestamps: false,
      indexes: [{ unique: true, fields: ["module", "action"] }],
    },
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: "permission_id",
    });
  };

  return Permission;
};
