module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sales", "total_cost", {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0.0,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("sales", "total_cost");
  },
};
