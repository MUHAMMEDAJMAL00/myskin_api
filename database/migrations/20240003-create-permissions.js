module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("permissions", {
      id         : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      module     : { type: Sequelize.STRING(50), allowNull: false },
      action     : { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.TEXT },
    });
    await queryInterface.addIndex("permissions", ["module", "action"], { unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("permissions"); }
};
