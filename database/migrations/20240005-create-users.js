module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("users", {
      id           : { type: Sequelize.INTEGER,     primaryKey: true, autoIncrement: true, allowNull: false },
      store_id     : { type: Sequelize.INTEGER,     references: { model: "stores", key: "id" }, onDelete: "SET NULL" },
      role_id      : { type: Sequelize.INTEGER,     allowNull: false, references: { model: "roles", key: "id" } },
      name         : { type: Sequelize.STRING(100), allowNull: false },
      username     : { type: Sequelize.STRING(50),  allowNull: false, unique: true },
      email        : { type: Sequelize.STRING(100), unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      phone        : { type: Sequelize.STRING(20) },
      is_active    : { type: Sequelize.TINYINT,     defaultValue: 1 },
      last_login   : { type: Sequelize.DATE },
      created_at   : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at   : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("users"); }
};
