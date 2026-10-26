module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("role_permissions", {
      id           : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      role_id      : { type: Sequelize.INTEGER, allowNull: false, references: { model: "roles",       key: "id" }, onDelete: "CASCADE" },
      permission_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "permissions", key: "id" }, onDelete: "CASCADE" },
    });
    await queryInterface.addIndex("role_permissions", ["role_id", "permission_id"], { unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("role_permissions"); }
};
