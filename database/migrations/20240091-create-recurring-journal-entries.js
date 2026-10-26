module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("recurring_journal_entries", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      frequency: { type: Sequelize.ENUM("daily", "weekly", "monthly", "yearly"), allowNull: false, defaultValue: "monthly" },
      day_of_month: { type: Sequelize.INTEGER, allowNull: true },
      day_of_week: { type: Sequelize.INTEGER, allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      next_run_date: { type: Sequelize.DATEONLY, allowNull: false },
      last_run_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.TINYINT(1), defaultValue: 1 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable("recurring_je_lines", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      recurring_je_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "recurring_journal_entries", key: "id" }, onDelete: "CASCADE" },
      ledger_account_id: { type: Sequelize.INTEGER, allowNull: false },
      debit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      credit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("recurring_je_lines");
    await queryInterface.dropTable("recurring_journal_entries");
  },
};
