module.exports = {
  up: async (queryInterface, Sequelize) => {
    let exists = true;
    try {
      await queryInterface.describeTable("purchase_returns");
    } catch (_) {
      exists = false;
    }
    if (exists) return;

    await queryInterface.createTable("purchase_returns", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      return_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      store_id:    { type: Sequelize.INTEGER, allowNull: false },
      vendor_id:   { type: Sequelize.INTEGER, allowNull: false },
      purchase_id: { type: Sequelize.INTEGER, allowNull: true },
      user_id:     { type: Sequelize.INTEGER, allowNull: false },
      return_date: { type: Sequelize.DATEONLY, defaultValue: Sequelize.NOW },
      status: {
        type: Sequelize.ENUM("draft", "approved", "rejected", "completed", "cancelled"),
        defaultValue: "draft",
      },
      reason:        { type: Sequelize.STRING(255), allowNull: true },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      subtotal:      { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      tax_amount:    { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      total_amount:  { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      refund_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      refund_method: {
        type: Sequelize.ENUM("cash", "bank_transfer", "credit_note", "debit_note", "adjustment"),
        defaultValue: "adjustment",
      },
      refund_status: {
        type: Sequelize.ENUM("pending", "processed"),
        defaultValue: "pending",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex("purchase_returns", ["store_id"]);
    await queryInterface.addIndex("purchase_returns", ["vendor_id"]);
    await queryInterface.addIndex("purchase_returns", ["purchase_id"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("purchase_returns");
  },
};
