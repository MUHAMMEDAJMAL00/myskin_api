module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("stores", "allow_negative_stock", {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("stores", "allow_negative_stock");
  },
};
