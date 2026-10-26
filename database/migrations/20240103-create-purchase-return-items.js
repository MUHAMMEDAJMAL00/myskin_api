module.exports = {
  up: async (queryInterface, Sequelize) => {
    let exists = true;
    try {
      await queryInterface.describeTable("purchase_return_items");
    } catch (_) {
      exists = false;
    }
    if (exists) return;

    await queryInterface.createTable("purchase_return_items", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_return_id: { type: Sequelize.INTEGER, allowNull: false },
      product_id:         { type: Sequelize.INTEGER, allowNull: false },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "product_variants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      purchase_item_id:   { type: Sequelize.INTEGER, allowNull: true },
      quantity:     { type: Sequelize.DECIMAL(10, 3), allowNull: false },
      unit_price:   { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_rate:     { type: Sequelize.DECIMAL(5, 2),  defaultValue: 0.0 },
      tax_amount:   { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      total_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      reason:       { type: Sequelize.STRING(255),    allowNull: true },
    });

    await queryInterface.addIndex("purchase_return_items", ["purchase_return_id"]);
    await queryInterface.addIndex("purchase_return_items", ["product_id"]);
    await queryInterface.addIndex("purchase_return_items", ["variant_id"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("purchase_return_items");
  },
};
