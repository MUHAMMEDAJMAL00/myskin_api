module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("stock_movements", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      product_id     : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "products", key: "id" } },
      store_id       : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "stores",   key: "id" } },
      user_id        : { type: Sequelize.INTEGER,       references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      movement_type  : { type: Sequelize.STRING(30),    allowNull: false },
      reference_type : { type: Sequelize.STRING(30) },
      reference_id   : { type: Sequelize.INTEGER },
      quantity_before: { type: Sequelize.DECIMAL(12,3) },
      quantity_change: { type: Sequelize.DECIMAL(12,3), allowNull: false },
      quantity_after : { type: Sequelize.DECIMAL(12,3) },
      notes          : { type: Sequelize.TEXT },
      created_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("stock_movements"); }
};
