module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("quotations", {
      id               : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      quotation_number : { type: Sequelize.STRING(50),    allowNull: false, unique: true },
      store_id         : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "stores",    key: "id" } },
      user_id          : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "users",     key: "id" } },
      customer_id      : { type: Sequelize.INTEGER,       references: { model: "customers", key: "id" }, onDelete: "SET NULL" },
      customer_name    : { type: Sequelize.STRING(150) },
      quotation_date   : { type: Sequelize.DATE,          defaultValue: Sequelize.NOW },
      valid_until      : { type: Sequelize.DATEONLY },
      status           : { type: Sequelize.STRING(20),    defaultValue: "pending" },
      subtotal         : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      discount_amount  : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      tax_amount       : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      total_amount     : { type: Sequelize.DECIMAL(12,2), defaultValue: 0.00 },
      notes            : { type: Sequelize.TEXT },
      converted_sale_id: { type: Sequelize.INTEGER,       references: { model: "sales", key: "id" }, onDelete: "SET NULL" },
      created_at       : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at       : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("quotations"); }
};
