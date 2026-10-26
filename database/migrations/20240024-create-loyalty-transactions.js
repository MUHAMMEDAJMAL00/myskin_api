module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("loyalty_transactions", {
      id              : { type: Sequelize.INTEGER,    primaryKey: true, autoIncrement: true, allowNull: false },
      customer_id     : { type: Sequelize.INTEGER,    allowNull: false, references: { model: "customers", key: "id" }, onDelete: "CASCADE" },
      sale_id         : { type: Sequelize.INTEGER,    references: { model: "sales", key: "id" }, onDelete: "SET NULL" },
      transaction_type: { type: Sequelize.STRING(20), allowNull: false },
      points          : { type: Sequelize.INTEGER,    allowNull: false },
      balance_after   : { type: Sequelize.INTEGER,    allowNull: false },
      notes           : { type: Sequelize.TEXT },
      created_at      : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("loyalty_transactions"); }
};
