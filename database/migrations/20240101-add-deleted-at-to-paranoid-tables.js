module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      "account_ledger",
      "assets",
      "contra_vouchers",
      "credit_notes",
      "customers",
      "debit_notes",
      "discounts",
      "employees",
      "expenses",
      "journal_entries",
      "payroll_runs",
      "purchases",
      "quotations",
      "returns",
      "sales",
      "stores",
      "vendors",
    ];

    for (const table of tables) {
      let columns;
      try {
        columns = await queryInterface.describeTable(table);
      } catch (_) {
        continue;
      }
      if (!columns.deleted_at) {
        await queryInterface.addColumn(table, "deleted_at", {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        });
      }
    }
  },

  down: async (queryInterface) => {
    const tables = [
      "account_ledger",
      "assets",
      "contra_vouchers",
      "credit_notes",
      "customers",
      "debit_notes",
      "discounts",
      "employees",
      "expenses",
      "journal_entries",
      "payroll_runs",
      "purchases",
      "quotations",
      "returns",
      "sales",
      "stores",
      "vendors",
    ];

    for (const table of tables) {
      let columns;
      try {
        columns = await queryInterface.describeTable(table);
      } catch (_) {
        continue;
      }
      if (columns.deleted_at) {
        await queryInterface.removeColumn(table, "deleted_at");
      }
    }
  },
};
