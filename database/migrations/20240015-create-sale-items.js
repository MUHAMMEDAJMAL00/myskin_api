module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("sale_items", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      sale_id        : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "sales",    key: "id" }, onDelete: "CASCADE" },
      product_id     : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "products", key: "id" } },
      product_name   : { type: Sequelize.STRING(200),   allowNull: false },
      product_sku    : { type: Sequelize.STRING(100) },
      quantity       : { type: Sequelize.DECIMAL(12,3), allowNull: false },
      unit_price     : { type: Sequelize.DECIMAL(12,2), allowNull: false },
      discount_type  : { type: Sequelize.STRING(10),    defaultValue: "none" },
      discount_value : { type: Sequelize.DECIMAL(10,2), defaultValue: 0.00 },
      discount_amount: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      tax_rate       : { type: Sequelize.DECIMAL(5,2),  defaultValue: 0.00 },
      tax_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      total_price    : { type: Sequelize.DECIMAL(12,2), allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("sale_items"); }
};
