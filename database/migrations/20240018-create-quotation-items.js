module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("quotation_items", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      quotation_id   : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "quotations", key: "id" }, onDelete: "CASCADE" },
      product_id     : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "products",   key: "id" } },
      product_name   : { type: Sequelize.STRING(200),   allowNull: false },
      quantity       : { type: Sequelize.DECIMAL(12,3), allowNull: false },
      unit_price     : { type: Sequelize.DECIMAL(12,2), allowNull: false },
      discount_amount: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      tax_rate       : { type: Sequelize.DECIMAL(5,2),  defaultValue: 0.00 },
      tax_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      total_price    : { type: Sequelize.DECIMAL(12,2), allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("quotation_items"); }
};
