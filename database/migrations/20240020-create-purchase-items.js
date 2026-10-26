module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("purchase_items", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      purchase_id    : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "purchases", key: "id" }, onDelete: "CASCADE" },
      product_id     : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "products",  key: "id" } },
      product_name   : { type: Sequelize.STRING(200),   allowNull: false },
      quantity       : { type: Sequelize.DECIMAL(12,3), allowNull: false },
      unit_cost      : { type: Sequelize.DECIMAL(12,2), allowNull: false },
      discount_amount: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      tax_rate       : { type: Sequelize.DECIMAL(5,2),  defaultValue: 0.00 },
      tax_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      total_cost     : { type: Sequelize.DECIMAL(12,2), allowNull: false },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("purchase_items"); }
};
