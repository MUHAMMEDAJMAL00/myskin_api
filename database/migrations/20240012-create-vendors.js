module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("vendors", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      name           : { type: Sequelize.STRING(150),   allowNull: false },
      company        : { type: Sequelize.STRING(150) },
      email          : { type: Sequelize.STRING(100) },
      phone          : { type: Sequelize.STRING(20) },
      address        : { type: Sequelize.TEXT },
      city           : { type: Sequelize.STRING(100) },
      state          : { type: Sequelize.STRING(100) },
      country        : { type: Sequelize.STRING(100),   defaultValue: "India" },
      postal_code    : { type: Sequelize.STRING(20) },
      tax_number     : { type: Sequelize.STRING(50) },
      opening_balance: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      balance        : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      notes          : { type: Sequelize.TEXT },
      is_active      : { type: Sequelize.TINYINT,       defaultValue: 1 },
      created_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("vendors"); }
};
