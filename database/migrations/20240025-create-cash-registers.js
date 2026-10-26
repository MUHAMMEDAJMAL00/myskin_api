module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("cash_registers", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      opening_balance: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      closing_balance: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      expected_balance: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      difference: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      status: { type: Sequelize.STRING(20), defaultValue: "open" },
      opened_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      closed_at: { type: Sequelize.DATE },
      notes: { type: Sequelize.TEXT },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("cash_registers");
  },
};
