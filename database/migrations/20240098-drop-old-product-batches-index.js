"use strict";

module.exports = {
  async up(queryInterface) {
    // Drop the old Sequelize auto-generated unique index that doesn't include variant_id
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM product_batches WHERE Key_name = 'product_batches_product_id_store_id_batch_number'"
    );
    if (indexes.length > 0) {
      await queryInterface.removeIndex("product_batches", "product_batches_product_id_store_id_batch_number");
    }
  },

  async down(queryInterface) {
    await queryInterface.addIndex(
      "product_batches",
      ["product_id", "store_id", "batch_number"],
      { unique: true, name: "product_batches_product_id_store_id_batch_number" }
    );
  },
};
