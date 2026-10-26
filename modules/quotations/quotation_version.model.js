const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const QuotationVersion = sequelize.define(
    "QuotationVersion",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      quotation_id: { type: DataTypes.INTEGER, allowNull: false },
      version_number: { type: DataTypes.INTEGER, allowNull: false },
      snapshot: { type: DataTypes.TEXT("long"), allowNull: false },
      changed_by: { type: DataTypes.INTEGER, allowNull: true },
      change_notes: { type: DataTypes.STRING(255), allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "quotation_versions",
      underscored: true,
      timestamps: false,
    },
  );

  QuotationVersion.associate = (models) => {
    QuotationVersion.belongsTo(models.Quotation, { foreignKey: "quotation_id" });
    QuotationVersion.belongsTo(models.User, {
      foreignKey: "changed_by",
      as: "changedBy",
    });
  };

  return QuotationVersion;
};
