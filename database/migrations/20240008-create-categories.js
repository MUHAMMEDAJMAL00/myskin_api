module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("categories", {
      id         : { type: Sequelize.INTEGER,     primaryKey: true, autoIncrement: true, allowNull: false },
      parent_id  : { type: Sequelize.INTEGER,     references: { model: "categories", key: "id" }, onDelete: "SET NULL" },
      name       : { type: Sequelize.STRING(100), allowNull: false },
      slug       : { type: Sequelize.STRING(100), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT },
      image_url  : { type: Sequelize.TEXT },
      sort_order : { type: Sequelize.INTEGER,     defaultValue: 0 },
      is_active  : { type: Sequelize.TINYINT,     defaultValue: 1 },
      created_at : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("categories"); }
};
