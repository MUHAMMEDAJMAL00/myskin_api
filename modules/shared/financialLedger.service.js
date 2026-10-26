"use strict";

const jeSvc = require("../journalEntries/journalEntries.service");
const { LedgerAccountMapping, LedgerAccount, Notification } = require("../../database/index");

const BANK_METHODS = new Set(["bank", "bank_transfer", "card", "upi", "cheque"]);

const PAYMENT_KEY_MAP = {
  cash:           "payment_cash",
  bank:           "payment_bank",
  bank_transfer:  "payment_bank",
  card:           "payment_bank",
  upi:            "payment_bank",
  cheque:         "payment_bank",
  loyalty_points: "payment_loyalty",
};

const _mappingCache = new Map();
const CACHE_TTL_MS = 60_000;

async function _loadMappings(storeId) {
  const rows = await LedgerAccountMapping.findAll({
    where: { store_id: storeId },
    include: [{ model: LedgerAccount, attributes: ["name"] }],
    raw: true,
    nest: true,
  });
  const map = {};
  for (const r of rows) {
    map[r.mapping_key] = r.LedgerAccount.name;
  }
  _mappingCache.set(storeId, { data: map, ts: Date.now() });
  return map;
}

async function _getMappings(storeId) {
  const cached = _mappingCache.get(storeId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  return _loadMappings(storeId);
}

function clearMappingCache(storeId) {
  if (storeId) _mappingCache.delete(storeId);
  else _mappingCache.clear();
}

async function getMappingName(storeId, mappingKey, defaultName) {
  try {
    const mappings = await _getMappings(storeId);
    if (mappings[mappingKey]) return mappings[mappingKey];
  } catch (_) { /* ignore — fall back to default */ }

  if (defaultName) return defaultName;

  const acc = await LedgerAccount.findOne({ where: { store_id: storeId, name: mappingKey.replace(/_/g, " ") } });
  if (acc) return acc.name;

  return mappingKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getPaymentAccName(storeId, paymentMethod) {
  const method = (paymentMethod || "cash").toLowerCase();
  const mapKey = PAYMENT_KEY_MAP[method] || "payment_cash";
  return getMappingName(storeId, mapKey, method === "loyalty_points" ? "Loyalty Points Payable" : BANK_METHODS.has(method) ? "Bank/Current Account" : "Cash");
}

function paymentMethodToMappingKey(paymentMethod) {
  return PAYMENT_KEY_MAP[(paymentMethod || "cash").toLowerCase()] || "payment_cash";
}

async function postNamedJE(
  { store_id, reference_type, reference_id, date, description, namedLines, user_id },
  t,
) {
  try {
    const resolvedLines = await Promise.all(
      namedLines.map(async (l) => {
        const name = l.mappingKey
          ? await getMappingName(store_id, l.mappingKey, l.name)
          : l.name;
        return { ...l, name };
      }),
    );

    const accounts = await Promise.all(
      resolvedLines.map((l) => jeSvc.findAccountByName(store_id, l.name, t)),
    );

    const lines = resolvedLines.map((l, i) => ({
      ledger_account_id: accounts[i].id,
      debit:  parseFloat(l.debit  || 0),
      credit: parseFloat(l.credit || 0),
    }));

    await jeSvc.postJournalEntry(
      {
        store_id,
        date:           date || new Date(),
        description:    description || `${reference_type} #${reference_id}`,
        reference_type,
        reference_id,
        is_manual:      false,
        created_by:     user_id,
        lines,
      },
      t,
    );
  } catch (err) {
    const msg = `Journal entry not posted for ${reference_type} #${reference_id}: ${err.message}. Run Chart of Accounts setup for this store.`;
    console.error(`[JE-FAIL] store=${store_id} ${msg}`);

    setImmediate(async () => {
      try {
        await Notification.create({
          store_id:       store_id   || null,
          user_id:        null,
          type:           "system",
          title:          "⚠ Accounting Error — Journal Entry Not Posted",
          message:        msg,
          reference_type: reference_type || null,
          reference_id:   reference_id   || null,
          is_read:        false,
        });
      } catch (notifErr) {
        console.error("[JE-FAIL] Notification write failed:", notifErr.message);
      }
    });

    throw err;
  }
}

module.exports = {
  moneyAccName: getPaymentAccName,
  getMappingName,
  getPaymentAccName,
  paymentMethodToMappingKey,
  postNamedJE,
  clearMappingCache,
};