module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sales", "payment_status", {
      type: Sequelize.STRING(20),
      defaultValue: "paid",
      allowNull: true,
    });
    // Existing sales with due=0 are fully paid; those with due>0 are partial
    await queryInterface.sequelize.query(`
      UPDATE sales
      SET payment_status = CASE
        WHEN due_amount <= 0 THEN 'paid'
        WHEN paid_amount > 0 THEN 'partial'
        ELSE 'unpaid'
      END
      WHERE deleted_at IS NULL
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("sales", "payment_status");
  },
};
