"use strict";

/**
 * Backfill: Create missing journal entries for existing wastage records
 * that were created before the cost_price fallback fix.
 *
 * These records have stock movements but no JE because cost_price was 0.
 */

const { Op } = require("sequelize");
const {
  Wastage,
  Product,
  ProductBatch,
  JournalEntry,
  sequelize,
} = require("../database/index");
const ledger   = require("../modules/accountLedger/accountLedger.service");
const fLedger  = require("../modules/shared/financialLedger.service");
const auditLog = require("../modules/auditLog/auditLog.service");

async function fixWastageMissingJournal() {
  console.log("=== Fix Wastage Missing Journal Entries ===\n");

  const wastages = await Wastage.findAll({
    include: [{ model: Product, attributes: ["id", "name", "purchase_price"] }],
    order: [["id", "ASC"]],
  });

  let fixedCount = 0;
  for (const w of wastages) {
    const hasJE = await JournalEntry.findOne({
      where: { reference_type: "wastage", reference_id: w.id },
    });
    if (hasJE) continue;

    const qty = parseFloat(w.quantity);
    const vid = w.variant_id || null;
    let unitCost = parseFloat(w.Product?.purchase_price || 0);

    if (unitCost <= 0) {
      const batch = await ProductBatch.findOne({
        where: { product_id: w.product_id, variant_id: vid, store_id: w.store_id, is_active: 1, current_quantity: { [Op.gt]: 0 } },
        order: [["created_at", "DESC"]],
      });
      if (batch) unitCost = parseFloat(batch.purchase_rate || 0);
    }

    const costValue = unitCost * qty;
    if (costValue <= 0) {
      console.log(`  SKIP #${w.id} — cost is 0 (no batch data)`);
      continue;
    }

    const productName = w.Product?.name || `Product #${w.product_id}`;
    const reason = w.reason || "other";

    await sequelize.transaction(async (t) => {
      await ledger.writeEntries([
        {
          store_id: w.store_id, party_type: "expense",
          transaction_type: "wastage", reference_type: "wastage",
          reference_id: w.id, debit: costValue, credit: 0,
          description: `Wastage: ${reason} — ${productName}`,
          transaction_date: w.wastage_date || w.created_at || new Date(),
          created_by: w.user_id,
        },
        {
          store_id: w.store_id, party_type: "inventory",
          transaction_type: "wastage", reference_type: "wastage",
          reference_id: w.id, debit: 0, credit: costValue,
          description: `Inventory written off: ${productName}`,
          transaction_date: w.wastage_date || w.created_at || new Date(),
          created_by: w.user_id,
        },
      ], t);

      await fLedger.postNamedJE({
        store_id: w.store_id,
        reference_type: "wastage",
        reference_id: w.id,
        date: w.wastage_date || w.created_at || new Date(),
        description: `Wastage: ${productName} (qty ${qty})`,
        namedLines: [
          { mappingKey: "general_expenses", debit: costValue, credit: 0 },
          { mappingKey: "stock_in_hand",    debit: 0, credit: costValue },
        ],
        user_id: w.user_id,
      }, t);

      await auditLog.log({
        store_id: w.store_id, user_id: w.user_id,
        module: "wastages", action: "backfill_je",
        reference_type: "wastage", reference_id: w.id,
        new_values: { cost: costValue, reason, backfilled: true },
      });
    });

    console.log(`  FIXED #${w.id} — ${productName} x${qty} @ ₹${unitCost} = ₹${costValue}`);
    fixedCount++;
  }

  console.log(`\n=== Done — ${fixedCount} wastage record(s) fixed ===`);
}

fixWastageMissingJournal()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
