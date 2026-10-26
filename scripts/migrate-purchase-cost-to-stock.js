"use strict";

const { sequelize, LedgerAccount, JournalEntry, JournalEntryLine } = require("../database/index");
const { Op } = require("sequelize");

async function migrate() {
  const t = await sequelize.transaction();
  try {
    const stores = await JournalEntry.findAll({
      where: { reference_type: "purchase" },
      attributes: ["store_id"],
      group: ["store_id"],
      raw: true,
      transaction: t,
    });

    if (!stores.length) {
      console.log("No purchase JEs found — nothing to migrate.");
      await t.rollback();
      return;
    }

    console.log(`Found ${stores.length} store(s) with purchase JEs.`);
    let totalUpdated = 0;

    for (const { store_id } of stores) {
      const purchasesAc = await LedgerAccount.findOne({
        where: { name: "Purchases Products", store_id },
        transaction: t,
      });
      const stockAc = await LedgerAccount.findOne({
        where: { name: "Stock In Hand", store_id },
        transaction: t,
      });

      if (!purchasesAc) {
        console.log(`  Store ${store_id}: No 'Purchases Products' account — skipping.`);
        continue;
      }
      if (!stockAc) {
        console.log(`  Store ${store_id}: No 'Stock In Hand' account. Create it via Chart of Accounts setup first.`);
        continue;
      }

      const [updated] = await JournalEntryLine.update(
        { ledger_account_id: stockAc.id },
        {
          where: {
            ledger_account_id: purchasesAc.id,
            debit: { [Op.gt]: 0 },
          },
          transaction: t,
        },
      );

      if (updated > 0) {
        totalUpdated += updated;
        console.log(`  Store ${store_id}: Migrated ${updated} JE line(s) (Purchases Products ID=${purchasesAc.id} → Stock In Hand ID=${stockAc.id}).`);
      } else {
        console.log(`  Store ${store_id}: No JE lines to migrate.`);
      }
    }

    await t.commit();
    console.log(`\nDone. Total: ${totalUpdated} JE line(s) migrated across ${stores.length} store(s).`);
  } catch (err) {
    await t.rollback();
    console.error("Migration failed:", err.message);
  }
}

migrate().then(() => process.exit(0));
