const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AppConfig = sequelize.define(
    "AppConfig",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER },
      config_key: { type: DataTypes.STRING(100), allowNull: false },
      config_value: { type: DataTypes.TEXT },
      data_type: { type: DataTypes.STRING(20), defaultValue: "string" },
      description: { type: DataTypes.TEXT },
    },
    {
      tableName: "app_config",
      underscored: true,
      createdAt: false,
      indexes: [{ unique: true, fields: ["store_id", "config_key"] }],
    },
  );

  AppConfig.associate = (models) => {
    AppConfig.belongsTo(models.Store, { foreignKey: "store_id" });
  };

  return AppConfig;
};
