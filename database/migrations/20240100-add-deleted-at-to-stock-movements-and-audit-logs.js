module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("stock_movements", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("audit_logs", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("stock_movements", "deleted_at");
    await queryInterface.removeColumn("audit_logs", "deleted_at");
  },
};
