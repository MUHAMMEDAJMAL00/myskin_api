module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user_store_assignments", {
      id        : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id   : { type: Sequelize.INTEGER, allowNull: false, references: { model: "users",  key: "id" }, onDelete: "CASCADE" },
      store_id  : { type: Sequelize.INTEGER, allowNull: false, references: { model: "stores", key: "id" }, onDelete: "CASCADE" },
      is_primary: { type: Sequelize.TINYINT, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("user_store_assignments", ["user_id", "store_id"], { unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("user_store_assignments"); }
};
