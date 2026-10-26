"use strict";

/**
 * One-time backfill: Fix Customer.balance for existing Credit Notes
 * created before the auto-update fix was implemented.
 *
 * - Outstanding: Customer.increment was missing from create → increment now
 * - Settled:     Create increment + Settle decrement were both missing
 *                → net 0, so nothing to fix for settled notes
 */

const { Op } = require("sequelize");
const { CreditNote, Customer, sequelize } = require("../database/index");

async function fixCreditNoteCustomerBalance() {
  console.log("=== Fix Credit Note Customer Balance ===\n");

  const notes = await CreditNote.findAll({
    where: {
      customer_id: { [Op.ne]: null },
      subtotal: { [Op.gt]: 0 },
      payment_status: "Outstanding",
    },
    attributes: ["id", "credit_note_number", "customer_id", "subtotal", "payment_status"],
    order: [["id", "ASC"]],
  });

  if (!notes.length) {
    console.log("No outstanding credit notes found. Nothing to fix.");
    return;
  }

  console.log(`Found ${notes.length} outstanding credit note(s) to fix:\n`);

  for (const note of notes) {
    const subtotal = parseFloat(note.subtotal);
    if (subtotal <= 0) continue;

    await sequelize.transaction(async (t) => {
      await Customer.increment("balance", {
        by: subtotal,
        where: { id: note.customer_id },
        transaction: t,
      });
    });

    console.log(`  FIXED #${note.id} ${note.credit_note_number} — increment by ${subtotal}`);
  }

  console.log(`\n=== Done — ${notes.length} credit note(s) fixed ===`);
}

fixCreditNoteCustomerBalance()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
