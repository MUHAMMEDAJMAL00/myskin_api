module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("customers", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      name           : { type: Sequelize.STRING(150),   allowNull: false },
      email          : { type: Sequelize.STRING(100) },
      phone          : { type: Sequelize.STRING(20),    unique: true },
      address        : { type: Sequelize.TEXT },
      city           : { type: Sequelize.STRING(100) },
      state          : { type: Sequelize.STRING(100) },
      country        : { type: Sequelize.STRING(100),   defaultValue: "India" },
      postal_code    : { type: Sequelize.STRING(20) },
      date_of_birth  : { type: Sequelize.DATEONLY },
      gender         : { type: Sequelize.STRING(10) },
      loyalty_points : { type: Sequelize.INTEGER,       defaultValue: 0 },
      opening_balance: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      balance        : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      notes          : { type: Sequelize.TEXT },
      is_active      : { type: Sequelize.TINYINT,       defaultValue: 1 },
      created_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("customers"); }
};
