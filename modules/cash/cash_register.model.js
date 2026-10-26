const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CashRegister = sequelize.define(
    "CashRegister",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      opening_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      closing_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      expected_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      difference: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      status: {
        type: DataTypes.ENUM("open", "closed"),
        defaultValue: "open",
      },
      opened_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      closed_at: { type: DataTypes.DATE },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "cash_registers",
      underscored: true,
      timestamps: true,
    },
  );

  CashRegister.associate = (models) => {
    CashRegister.belongsTo(models.Store, { foreignKey: "store_id" });
    CashRegister.belongsTo(models.User, { foreignKey: "user_id" });
    CashRegister.hasMany(models.CashMovement, {
      foreignKey: "cash_register_id",
      as: "movements",
    });
  };

  return CashRegister;
};
