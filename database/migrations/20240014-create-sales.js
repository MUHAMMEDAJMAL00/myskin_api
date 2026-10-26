module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("sales", {
      id             : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      invoice_number : { type: Sequelize.STRING(50),    allowNull: false, unique: true },
      store_id       : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "stores",    key: "id" } },
      user_id        : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "users",     key: "id" } },
      customer_id    : { type: Sequelize.INTEGER,       references: { model: "customers", key: "id" }, onDelete: "SET NULL" },
      quotation_id   : { type: Sequelize.INTEGER },
      sale_date      : { type: Sequelize.DATE,          defaultValue: Sequelize.NOW },
      status         : { type: Sequelize.STRING(20),    defaultValue: "completed" },
      subtotal       : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      discount_type  : { type: Sequelize.STRING(10),    defaultValue: "none" },
      discount_value : { type: Sequelize.DECIMAL(10,2), defaultValue: 0.00 },
      discount_amount: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      tax_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      shipping_charge: { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      round_off      : { type: Sequelize.DECIMAL(5,2),  defaultValue: 0.00 },
      total_amount   : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      paid_amount    : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      due_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      notes          : { type: Sequelize.TEXT },
      created_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at     : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("sales"); }
};
