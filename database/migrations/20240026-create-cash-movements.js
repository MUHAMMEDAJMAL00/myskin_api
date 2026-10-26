module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("cash_movements", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      cash_register_id: { type: Sequelize.INTEGER, allowNull: false },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      movement_type: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      reference_type: { type: Sequelize.STRING(30) },
      reference_id: { type: Sequelize.INTEGER },
      notes: { type: Sequelize.TEXT },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("cash_movements");
  },
};
