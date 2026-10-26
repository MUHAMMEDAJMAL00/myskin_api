"use strict";

const tables = [
  { name: "purchase_items",     after: "product_id" },
  { name: "sale_items",         after: "product_id" },
  { name: "return_items",       after: "product_id" },
  { name: "quotation_items",    after: "product_id" },
  { name: "product_batches",    after: "store_id"   },
  { name: "stock_movements",    after: "store_id"   },
  { name: "wastages",           after: "store_id"   },
  { name: "purchase_return_items", after: "product_id" },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const { name, after } of tables) {
      let cols;
      try {
        cols = await queryInterface.describeTable(name);
      } catch (_) {
        continue;
      }
      if (!cols.variant_id) {
        await queryInterface.addColumn(name, "variant_id", {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "product_variants", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
          after,
        });
        await queryInterface.addIndex(name, ["variant_id"], {
          name: `${name}_variant_id_index`,
        });
      }
    }
  },

  async down(queryInterface) {
    for (const { name } of tables) {
      let cols;
      try {
        cols = await queryInterface.describeTable(name);
      } catch (_) {
        continue;
      }
      if (cols.variant_id) {
        await queryInterface.removeIndex(name, `${name}_variant_id_index`);
        await queryInterface.removeColumn(name, "variant_id");
      }
    }
  },
};
