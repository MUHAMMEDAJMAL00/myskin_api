"use strict";

/**
 * Balance Recalculation Utility
 *
 * Recalculates customer or vendor balance from the account_ledger table,
 * which is the single source of truth for all financial transactions.
 *
 * Usage:
 *   const { recalcCustomerBalance, recalcVendorBalance } = require("../utils/recalcBalance");
 *   await recalcCustomerBalance(customer_id, store_id);
 *   await recalcVendorBalance(vendor_id, store_id);
 */

const { AccountLedger, Customer, Vendor, sequelize } = require("../database/index");
const { fn, col, literal } = require("sequelize");

/**
 * Recalculate a customer's balance from account_ledger and update customers.balance.
 * @param {number} customer_id
 * @param {number} store_id  — optional; if omitted, aggregates across all stores
 * @returns {number} recalculated balance
 */
const recalcCustomerBalance = async (customer_id, store_id) => {
  const where = { party_type: "customer", party_id: customer_id };
  if (store_id) where.store_id = parseInt(store_id);

  const result = await AccountLedger.findOne({
    where,
    attributes: [
      [fn("COALESCE", fn("SUM", col("debit")),  0), "total_debit"],
      [fn("COALESCE", fn("SUM", col("credit")), 0), "total_credit"],
    ],
    raw: true,
  });

  // Customer balance = credit - debit (credit means money owed TO customer)
  const balance = parseFloat(result.total_credit || 0) - parseFloat(result.total_debit || 0);
  const rounded = Math.round(balance * 100) / 100;

  await Customer.update({ balance: rounded }, { where: { id: customer_id } });
  return rounded;
};

/**
 * Recalculate a vendor's balance from account_ledger and update vendors.balance.
 * @param {number} vendor_id
 * @param {number} store_id  — optional
 * @returns {number} recalculated balance
 */
const recalcVendorBalance = async (vendor_id, store_id) => {
  const where = { party_type: "supplier", party_id: vendor_id };
  if (store_id) where.store_id = parseInt(store_id);

  const result = await AccountLedger.findOne({
    where,
    attributes: [
      [fn("COALESCE", fn("SUM", col("debit")),  0), "total_debit"],
      [fn("COALESCE", fn("SUM", col("credit")), 0), "total_credit"],
    ],
    raw: true,
  });

  // Vendor balance = debit - credit (debit means we owe the vendor)
  const balance = parseFloat(result.total_debit || 0) - parseFloat(result.total_credit || 0);
  const rounded = Math.round(balance * 100) / 100;

  await Vendor.update({ balance: rounded }, { where: { id: vendor_id } });
  return rounded;
};

module.exports = { recalcCustomerBalance, recalcVendorBalance };
