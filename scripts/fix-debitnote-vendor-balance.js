"use strict";

/**
 * One-time backfill: Fix Vendor.balance for existing Debit Notes
 * created before the auto-update fix was implemented.
 *
 * - Outstanding: Vendor decrement was missing from create → decrement now
 * - Settled:     Vendor return already decremented balance, but settle
 *                increment was missing → increment now to restore
 */

const { Op } = require("sequelize");
const { DebitNote, Vendor, sequelize } = require("../database/index");

async function fixDebitNoteVendorBalance() {
  console.log("=== Fix Debit Note Vendor Balance ===\n");

  const allNotes = await DebitNote.findAll({
    where: {
      vendor_id: { [Op.ne]: null },
      subtotal: { [Op.gt]: 0 },
    },
    attributes: ["id", "debit_note_number", "vendor_id", "subtotal", "payment_status"],
    order: [["id", "ASC"]],
  });

  if (!allNotes.length) {
    console.log("No debit notes with vendor found. Nothing to fix.");
    return;
  }

  let fixedCount = 0;
  for (const note of allNotes) {
    const subtotal = parseFloat(note.subtotal);
    if (subtotal <= 0) continue;

    if (note.payment_status === "Outstanding") {
      await sequelize.transaction(async (t) => {
        await Vendor.decrement("balance", {
          by: subtotal,
          where: { id: note.vendor_id },
          transaction: t,
        });
      });
      console.log(`  FIXED Outstanding #${note.id} ${note.debit_note_number} — decrement by ${subtotal}`);
      fixedCount++;
    } else if (note.payment_status === "Settled") {
      await sequelize.transaction(async (t) => {
        await Vendor.increment("balance", {
          by: subtotal,
          where: { id: note.vendor_id },
          transaction: t,
        });
      });
      console.log(`  FIXED Settled #${note.id} ${note.debit_note_number} — increment by ${subtotal}`);
      fixedCount++;
    }
  }

  console.log(`\n=== Done — ${fixedCount} debit note(s) fixed ===`);
}

fixDebitNoteVendorBalance()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
