module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("products", {
      id            : { type: Sequelize.INTEGER,        primaryKey: true, autoIncrement: true, allowNull: false },
      category_id   : { type: Sequelize.INTEGER,        references: { model: "categories", key: "id" }, onDelete: "SET NULL" },
      name          : { type: Sequelize.STRING(200),    allowNull: false },
      sku           : { type: Sequelize.STRING(100),    allowNull: false, unique: true },
      barcode       : { type: Sequelize.STRING(100),    unique: true },
      description   : { type: Sequelize.TEXT },
      unit          : { type: Sequelize.STRING(30),     defaultValue: "pcs" },
      purchase_price: { type: Sequelize.DECIMAL(12,2),  defaultValue: 0.00 },
      selling_price : { type: Sequelize.DECIMAL(12,2),  allowNull: false },
      tax_rate      : { type: Sequelize.DECIMAL(5,2),   defaultValue: 0.00 },
      discount_type : { type: Sequelize.STRING(10),     defaultValue: "none" },
      discount_value: { type: Sequelize.DECIMAL(10,2),  defaultValue: 0.00 },
      image_url     : { type: Sequelize.TEXT },
      is_active     : { type: Sequelize.TINYINT,        defaultValue: 1 },
      is_service    : { type: Sequelize.TINYINT,        defaultValue: 0 },
      alert_quantity: { type: Sequelize.INTEGER,        defaultValue: 5 },
      created_at    : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at    : { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("products"); }
};
