const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CashMovement = sequelize.define(
    "CashMovement",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cash_register_id: { type: DataTypes.INTEGER, allowNull: false },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      movement_type: { type: DataTypes.STRING(20), allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      reference_type: { type: DataTypes.STRING(30) },
      reference_id: { type: DataTypes.INTEGER },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "cash_movements",
      underscored: true,
      updatedAt: false,
    },
  );

  CashMovement.associate = (models) => {
    CashMovement.belongsTo(models.CashRegister, {
      foreignKey: "cash_register_id",
    });
    CashMovement.belongsTo(models.Store, { foreignKey: "store_id" });
    CashMovement.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return CashMovement;
};
