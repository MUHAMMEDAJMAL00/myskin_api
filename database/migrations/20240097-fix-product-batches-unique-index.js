"use strict";

module.exports = {
  async up(queryInterface) {
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM product_batches WHERE Key_name = 'unique_batch_per_product_store' AND Column_name != 'variant_id'"
    );
    if (indexes.length > 0) {
      await queryInterface.removeIndex("product_batches", "unique_batch_per_product_store");
      await queryInterface.addIndex(
        "product_batches",
        ["product_id", "store_id", "variant_id", "batch_number"],
        { unique: true, name: "unique_batch_per_product_store" }
      );
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("product_batches", "unique_batch_per_product_store");
    } catch (_) {}
    await queryInterface.addIndex(
      "product_batches",
      ["product_id", "store_id", "batch_number"],
      { unique: true, name: "unique_batch_per_product_store" }
    );
  },
};
