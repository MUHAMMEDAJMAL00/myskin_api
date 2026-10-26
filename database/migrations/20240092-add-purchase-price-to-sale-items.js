module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sale_items", "purchase_price", {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0.0,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("sale_items", "purchase_price");
  },
};
