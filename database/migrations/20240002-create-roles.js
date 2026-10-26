module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("roles", {
      id         : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name       : { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT },
      created_at : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("roles"); }
};
