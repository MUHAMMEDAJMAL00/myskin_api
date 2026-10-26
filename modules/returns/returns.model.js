const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Return = sequelize.define(
    "Return",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      return_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      sale_id: { type: DataTypes.INTEGER, allowNull: false },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      customer_id: { type: DataTypes.INTEGER },
      return_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      return_reason: { type: DataTypes.TEXT },
      total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      restocking_fee: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      refund_method: { type: DataTypes.STRING(30) },
      status: {
        type: DataTypes.ENUM("completed", "pending", "approved", "rejected"),
        defaultValue: "completed",
      },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "returns",
      underscored: true,
      timestamps: true,
      updatedAt: false,
      paranoid: true,
      indexes: [
        { fields: ["store_id", "return_date"] },
        { fields: ["sale_id"] },
      ],
    },
  );

  Return.associate = (models) => {
    Return.belongsTo(models.Sale, { foreignKey: "sale_id" });
    Return.belongsTo(models.Store, { foreignKey: "store_id" });
    Return.belongsTo(models.User, { foreignKey: "user_id" });
    Return.belongsTo(models.Customer, { foreignKey: "customer_id" });
    Return.hasMany(models.ReturnItem, { foreignKey: "return_id", as: "items" });
  };

  return Return;
};
