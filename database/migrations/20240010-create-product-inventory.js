module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("product_inventory", {
      id               : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      product_id       : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      store_id         : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "stores",   key: "id" }, onDelete: "CASCADE" },
      quantity         : { type: Sequelize.DECIMAL(12,3), defaultValue: 0.000 },
      reserved_quantity: { type: Sequelize.DECIMAL(12,3), defaultValue: 0.000 },
      created_at       : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at       : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("product_inventory", ["product_id", "store_id"], { unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("product_inventory"); }
};
