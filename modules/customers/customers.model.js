const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      email: { type: DataTypes.STRING(100) },
      phone: { type: DataTypes.STRING(20) },
      password_hash: { type: DataTypes.STRING(255), allowNull: true },
      address: { type: DataTypes.TEXT },
      city: { type: DataTypes.STRING(100) },
      state: { type: DataTypes.STRING(100) },
      country: { type: DataTypes.STRING(100), defaultValue: "India" },
      postal_code: { type: DataTypes.STRING(20) },
      date_of_birth: { type: DataTypes.DATEONLY },
      gender: { type: DataTypes.STRING(10) },
      loyalty_points: { type: DataTypes.INTEGER, defaultValue: 0 },
      opening_balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      credit_limit: { type: DataTypes.DECIMAL(12, 2), defaultValue: null, allowNull: true },
      notes: { type: DataTypes.TEXT },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName: "customers",
      underscored: true,
      paranoid: true,
    },
  );

  Customer.associate = (models) => {
    Customer.hasMany(models.Sale, { foreignKey: "customer_id" });
    Customer.hasMany(models.LoyaltyTransaction, { foreignKey: "customer_id" });
    Customer.hasMany(models.CustomerPayment, { foreignKey: "customer_id" });
    Customer.hasMany(models.CustomerRefreshToken, { foreignKey: "customer_id" });
    Customer.hasMany(models.CustomerCart, { foreignKey: "customer_id" });
    Customer.hasMany(models.CustomerWishlist, { foreignKey: "customer_id" });
    Customer.hasMany(models.CustomerAddress, { foreignKey: "customer_id" });
  };
  return Customer;
};
