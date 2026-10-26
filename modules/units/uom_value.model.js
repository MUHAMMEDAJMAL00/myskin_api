const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UomValue = sequelize.define(
    "UomValue",
    {
      id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      unit_id:   { type: DataTypes.INTEGER, allowNull: false },
      value:     { type: DataTypes.DECIMAL(10, 3), allowNull: false },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName:   "uom_values",
      underscored: true,
      timestamps:  true,
    },
  );

  UomValue.associate = (models) => {
    UomValue.belongsTo(models.Unit, { foreignKey: "unit_id", as: "unit" });
  };

  return UomValue;
};
