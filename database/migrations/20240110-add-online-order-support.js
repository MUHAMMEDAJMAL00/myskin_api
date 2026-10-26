"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let cols;
    try { cols = await queryInterface.describeTable("sales"); } catch (_) { return; }

    // Add source column if not exists
    if (!cols.source) {
      await queryInterface.addColumn("sales", "source", {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "pos",
      });
    }

    // Update status ENUM to include new workflow statuses
    await queryInterface.changeColumn("sales", "status", {
      type: Sequelize.ENUM("completed", "pending", "cancelled", "returned", "partial_return", "confirmed", "processing", "shipped", "delivered"),
      allowNull: false,
      defaultValue: "completed",
    });
  },

  async down(queryInterface, Sequelize) {
    let cols;
    try { cols = await queryInterface.describeTable("sales"); } catch (_) { return; }

    if (cols.source) {
      await queryInterface.removeColumn("sales", "source");
    }

    await queryInterface.changeColumn("sales", "status", {
      type: Sequelize.ENUM("completed", "pending", "cancelled", "returned", "partial_return"),
      allowNull: false,
      defaultValue: "completed",
    });
  },
};
