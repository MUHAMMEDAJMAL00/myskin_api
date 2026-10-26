"use strict";
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const TaxGroup = sequelize.define("TaxGroup", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    category: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "GST" },
    description: { type: DataTypes.STRING(255) },
    tax_type: { type: DataTypes.ENUM("inclusive","exclusive"), defaultValue: "exclusive" },
    rate: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    components: { type: DataTypes.JSON },
    is_inter_state: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
  }, { tableName: "tax_groups", underscored: true, timestamps: true });

  TaxGroup.associate = (models) => {
    TaxGroup.hasMany(models.Product, { foreignKey: "tax_group_id" });
    TaxGroup.belongsTo(models.Store, { foreignKey: "store_id" });
  };
  return TaxGroup;
};
