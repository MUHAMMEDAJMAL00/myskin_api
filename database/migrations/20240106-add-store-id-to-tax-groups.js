"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let cols;
    try { cols = await queryInterface.describeTable("tax_groups"); } catch (_) { return; }
    if (cols.store_id) return;

    await queryInterface.addColumn("tax_groups", "store_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      after: "id",
    });
  },

  async down(queryInterface) {
    let cols;
    try { cols = await queryInterface.describeTable("tax_groups"); } catch (_) { return; }
    if (!cols.store_id) return;
    await queryInterface.removeColumn("tax_groups", "store_id");
  },
};
