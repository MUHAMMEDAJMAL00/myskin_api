module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("returns", {
      id            : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      return_number : { type: Sequelize.STRING(50),    allowNull: false, unique: true },
      sale_id       : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "sales",     key: "id" } },
      store_id      : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "stores",    key: "id" } },
      user_id       : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "users",     key: "id" } },
      customer_id   : { type: Sequelize.INTEGER,       references: { model: "customers", key: "id" }, onDelete: "SET NULL" },
      return_date   : { type: Sequelize.DATE,          defaultValue: Sequelize.NOW },
      return_reason : { type: Sequelize.TEXT },
      total_amount  : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      refund_method : { type: Sequelize.STRING(30) },
      status        : { type: Sequelize.STRING(20),    defaultValue: "completed" },
      notes         : { type: Sequelize.TEXT },
      created_at    : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("returns"); }
};
