"use strict";

module.exports = {
  async up(queryInterface) {
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM product_inventory WHERE Key_name = 'product_inventory_product_id_store_id'"
    );
    if (indexes.length > 0) {
      await queryInterface.sequelize.query(
        "ALTER TABLE product_inventory DROP INDEX product_inventory_product_id_store_id"
      );
    }
    await queryInterface.addIndex("product_inventory", ["store_id", "product_id", "variant_id"], {
      unique: true,
      name: "product_inventory_store_id_product_id_variant_id",
    });
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("product_inventory", "product_inventory_store_id_product_id_variant_id");
    } catch (_) {}
    await queryInterface.addIndex("product_inventory", ["product_id", "store_id"], {
      unique: true,
      name: "product_inventory_product_id_store_id",
    });
  },
};
