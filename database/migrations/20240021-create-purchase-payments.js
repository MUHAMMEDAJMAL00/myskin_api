module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("purchase_payments", {
      id              : { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      purchase_id     : { type: Sequelize.INTEGER,       allowNull: false, references: { model: "purchases", key: "id" }, onDelete: "CASCADE" },
      payment_method  : { type: Sequelize.STRING(30),    allowNull: false },
      amount          : { type: Sequelize.DECIMAL(12,2), allowNull: false },
      reference_number: { type: Sequelize.STRING(100) },
      payment_date    : { type: Sequelize.DATE,          defaultValue: Sequelize.NOW },
      notes           : { type: Sequelize.TEXT },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable("purchase_payments"); }
};
