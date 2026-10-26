module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("stock_movements", "is_backorder", {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("stock_movements", "is_backorder");
  },
};
