module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("purchases", {
      id              : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      purchase_number : { type: Sequelize.STRING(50),    allowNull: false, unique: true },
      store_id        : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "stores",  key: "id" } },
      vendor_id       : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "vendors", key: "id" } },
      user_id         : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "users",   key: "id" } },
      purchase_date   : { type: Sequelize.DATE,          defaultValue: Sequelize.NOW },
      status          : { type: Sequelize.STRING(20),    defaultValue: "received" },
      subtotal        : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      discount_amount : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      tax_amount      : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      shipping_charge : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      total_amount    : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      paid_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      due_amount      : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      payment_status  : { type: Sequelize.STRING(20),    defaultValue: "unpaid" },
      reference_number: { type: Sequelize.STRING(100) },
      notes           : { type: Sequelize.TEXT },
      created_at      : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at      : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("purchases"); }
};
