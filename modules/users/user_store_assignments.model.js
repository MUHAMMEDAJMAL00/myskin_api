const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserStoreAssign = sequelize.define(
    "UserStoreAssign",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      is_primary: { type: DataTypes.TINYINT, defaultValue: 0 },
    },
    {
      tableName: "user_store_assignments",
      underscored: true,
      updatedAt: false,
      indexes: [{ unique: true, fields: ["user_id", "store_id"] }],
    },
  );

  UserStoreAssign.associate = (models) => {
    UserStoreAssign.belongsTo(models.User, { foreignKey: "user_id" });
    UserStoreAssign.belongsTo(models.Store, { foreignKey: "store_id" });
  };

  return UserStoreAssign;
};
