const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LoyaltyTransaction = sequelize.define(
    "LoyaltyTransaction",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: { type: DataTypes.INTEGER, allowNull: false },
      sale_id: { type: DataTypes.INTEGER },
      transaction_type: { type: DataTypes.STRING(20), allowNull: false },
      points: { type: DataTypes.INTEGER, allowNull: false },
      balance_after: { type: DataTypes.INTEGER, allowNull: false },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "loyalty_transactions",
      underscored: true,
      updatedAt: false,
    },
  );

  LoyaltyTransaction.associate = (models) => {
    LoyaltyTransaction.belongsTo(models.Customer, {
      foreignKey: "customer_id",
    });
    LoyaltyTransaction.belongsTo(models.Sale, { foreignKey: "sale_id" });
  };

  return LoyaltyTransaction;
};
