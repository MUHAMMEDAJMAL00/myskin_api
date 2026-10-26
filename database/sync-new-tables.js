"use strict";

/**
 * Legacy script — kept for backward compatibility.
 *
 * All tables are now created via proper migrations:
 *   - account_ledger  → migration 20240065
 *   - purchase_returns → migration 20240102
 *   - purchase_return_items → migration 20240103
 *   - recurring_journal_entries → migration 20240091
 *   - recurring_je_lines → migration 20240091
 *
 * Run migrations instead:  npx sequelize db:migrate
 * This script is only needed for deployments that haven't run those migrations yet.
 */

require("../config/env");
const sequelize = require("../config/database");

const AccountLedger      = require("../modules/accountLedger/account_ledger.model")(sequelize);
const PurchaseReturn     = require("../modules/purchaseReturns/purchase_returns.model")(sequelize);
const PurchaseReturnItem = require("../modules/purchaseReturns/purchase_return_items.model")(sequelize);
const RecurringJE        = require("../modules/recurringJE/recurring_je.model")(sequelize);
const RecurringJELine    = require("../modules/recurringJE/recurring_je_line.model")(sequelize);

PurchaseReturn.hasMany(PurchaseReturnItem, { foreignKey: "purchase_return_id", as: "items" });
PurchaseReturnItem.belongsTo(PurchaseReturn, { foreignKey: "purchase_return_id" });

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✓ Connected to database");

    await AccountLedger.sync({ force: false });
    console.log("✓ account_ledger table ready");

    await PurchaseReturn.sync({ force: false });
    console.log("✓ purchase_returns table ready");

    await PurchaseReturnItem.sync({ force: false });
    console.log("✓ purchase_return_items table ready");

    await RecurringJE.sync({ force: false });
    console.log("✓ recurring_journal_entries table ready");

    await RecurringJELine.sync({ force: false });
    console.log("✓ recurring_je_lines table ready");

    console.log("\n✓ All tables ready. Consider running `npx sequelize db:migrate` for proper migration tracking.");
  } catch (err) {
    console.error("✗ Sync failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
