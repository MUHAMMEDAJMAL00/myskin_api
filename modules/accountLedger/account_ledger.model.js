const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AccountLedger = sequelize.define(
    "AccountLedger",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      party_type: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      party_id: { type: DataTypes.INTEGER, allowNull: true },
      transaction_type: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      reference_type: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      reference_id: { type: DataTypes.INTEGER, allowNull: true },
      debit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      credit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      balance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "account_ledger",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      paranoid: true,
      deletedAt: "deleted_at",
      indexes: [
        { fields: ["store_id", "party_type", "party_id"] },
        { fields: ["store_id", "transaction_date"] },
        { fields: ["transaction_date"] },
        { fields: ["reference_type", "reference_id"] },
      ],
    },
  );

  AccountLedger.associate = function (models) {
    AccountLedger.belongsTo(models.Store, { foreignKey: "store_id" });
    AccountLedger.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "CreatedBy",
    });
  };

  return AccountLedger;
};
