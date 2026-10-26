module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("return_items", {
      id           : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      return_id    : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "returns",    key: "id" }, onDelete: "CASCADE" },
      sale_item_id : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "sale_items", key: "id" } },
      product_id   : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "products",   key: "id" } },
      product_name : { type: Sequelize.STRING(200),   allowNull: false },
      quantity     : { type: Sequelize.DECIMAL(12,3), allowNull: false },
      unit_price   : { type: Sequelize.DECIMAL(12,2), allowNull: false },
      total_amount : { type: Sequelize.DECIMAL(12,2), allowNull: false },
      restock      : { type: Sequelize.TINYINT,       defaultValue: 1 },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("return_items"); }
};
