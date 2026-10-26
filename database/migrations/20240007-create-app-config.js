module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("app_config", {
      id          : { type: Sequelize.INTEGER,     primaryKey: true, autoIncrement: true, allowNull: false },
      store_id    : { type: Sequelize.INTEGER,     references: { model: "stores", key: "id" }, onDelete: "CASCADE" },
      config_key  : { type: Sequelize.STRING(100), allowNull: false },
      config_value: { type: Sequelize.TEXT },
      data_type   : { type: Sequelize.STRING(20),  defaultValue: "string" },
      description : { type: Sequelize.TEXT },
      updated_at  : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("app_config", ["store_id", "config_key"], { unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("app_config"); }
};
