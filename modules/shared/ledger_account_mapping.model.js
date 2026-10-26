"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LedgerAccountMapping = sequelize.define(
    "LedgerAccountMapping",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      mapping_key: { type: DataTypes.STRING(80), allowNull: false },
      ledger_account_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "ledger_account_mappings",
      underscored: true,
      indexes: [
        { unique: true, fields: ["store_id", "mapping_key"] },
      ],
    },
  );

  LedgerAccountMapping.associate = (models) => {
    LedgerAccountMapping.belongsTo(models.LedgerAccount, { foreignKey: "ledger_account_id" });
  };

  return LedgerAccountMapping;
};
