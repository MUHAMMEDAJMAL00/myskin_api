"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("tax_groups", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255) },
      tax_type: { type: Sequelize.ENUM("inclusive", "exclusive"), defaultValue: "exclusive" },
      rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      components: { type: Sequelize.JSON },
      is_active: { type: Sequelize.TINYINT(1), defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addColumn("products", "tax_group_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      after: "category_id",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("products", "tax_group_id");
    await queryInterface.dropTable("tax_groups");
  },
};
