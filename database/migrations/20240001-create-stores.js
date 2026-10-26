module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("stores", {
      id        : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name      : { type: Sequelize.STRING(150), allowNull: false },
      code      : { type: Sequelize.STRING(20),  allowNull: false, unique: true },
      address   : { type: Sequelize.TEXT },
      phone     : { type: Sequelize.STRING(20) },
      email     : { type: Sequelize.STRING(100) },
      currency  : { type: Sequelize.STRING(10),  defaultValue: "INR" },
      timezone  : { type: Sequelize.STRING(50),  defaultValue: "Asia/Kolkata" },
      is_active : { type: Sequelize.TINYINT,     defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("stores"); }
};
