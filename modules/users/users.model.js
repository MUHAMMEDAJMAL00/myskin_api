const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER },
      role_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      email: { type: DataTypes.STRING(100), unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      phone: { type: DataTypes.STRING(20) },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
      last_login: { type: DataTypes.DATE },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: "role_id" });
    User.belongsTo(models.Store, { foreignKey: "store_id" });
    User.belongsToMany(models.Store, {
      through: models.UserStoreAssign,
      foreignKey: "user_id",
      as: "assignedStores",
    });
  };

  return User;
};
