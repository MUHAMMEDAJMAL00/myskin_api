const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Unit = sequelize.define(
    "Unit",
    {
      id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id:  { type: DataTypes.INTEGER, allowNull: true },
      name:      { type: DataTypes.STRING(50), allowNull: false },
      symbol:    { type: DataTypes.STRING(10) },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName:  "units",
      underscored: true,
      timestamps:  true,
    },
  );

  Unit.associate = (models) => {
    Unit.hasMany(models.UomValue, { foreignKey: "unit_id", as: "UomValues" });
  };

  return Unit;
};
