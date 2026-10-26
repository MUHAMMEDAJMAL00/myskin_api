"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;
    try {
      await queryInterface.describeTable("account_ledger");
    } catch (err) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("account_ledger", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        store_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "stores", key: "id" },
        },
        party_type: { type: Sequelize.STRING(40), allowNull: false },
        party_id: { type: Sequelize.INTEGER, allowNull: true },
        transaction_type: { type: Sequelize.STRING(40), allowNull: false },
        reference_type: { type: Sequelize.STRING(60), allowNull: true },
        reference_id: { type: Sequelize.INTEGER, allowNull: true },
        debit: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
        credit: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
        balance: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        description: { type: Sequelize.STRING(255), allowNull: true },
        transaction_date: { type: Sequelize.DATEONLY, allowNull: false },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
    } else {
      await queryInterface.changeColumn("account_ledger", "party_type", {
        type: Sequelize.STRING(40),
        allowNull: false,
      });
      await queryInterface.changeColumn("account_ledger", "party_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await queryInterface.changeColumn("account_ledger", "transaction_type", {
        type: Sequelize.STRING(40),
        allowNull: false,
      });
      await queryInterface.changeColumn("account_ledger", "reference_type", {
        type: Sequelize.STRING(60),
        allowNull: true,
      });

      const cols = await queryInterface.describeTable("account_ledger");
      if (!cols.balance) {
        await queryInterface.addColumn("account_ledger", "balance", {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          after: "credit",
        });
      }
    }

    await queryInterface.addIndex("account_ledger", ["store_id", "party_type", "party_id"], {
      name: "idx_account_ledger_store_party",
    }).catch(() => {});
    await queryInterface.addIndex("account_ledger", ["reference_type", "reference_id"], {
      name: "idx_account_ledger_reference",
    }).catch(() => {});
    await queryInterface.addIndex("account_ledger", ["transaction_date"], {
      name: "idx_account_ledger_date",
    }).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("account_ledger", "balance").catch(() => {});
  },
};
