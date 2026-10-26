"use strict";

const { Op } = require("sequelize");
const { DebitNote, DebitNoteLine, Vendor, Purchase, User, AccountLedger, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

const _generateNoteNumber = async (store_id, date, t = null) => {
  const d = typeof date === "string" ? date : (date instanceof Date ? date.toISOString() : new Date().toISOString());
  const month  = d.slice(0, 7).replace("-", "");
  const prefix = `DN-${month}-`;
  const opts   = t ? { transaction: t, lock: t.LOCK.UPDATE } : {};
  const last   = await DebitNote.findOne({
    where: { store_id, debit_note_number: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
    attributes: ["debit_note_number"],
    ...opts,
  });
  let seq = 1;
  if (last && last.debit_note_number) {
    const parts = last.debit_note_number.split("-");
    seq = parseInt(parts[parts.length - 1] || 0, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
};

const getAll = async (store_id, filters = {}) => {
  const { page = 1, limit = 20, from, to, search, payment_status } = filters;
  const where = {};
  if (store_id != null) where.store_id = store_id;
  if (payment_status) where.payment_status = payment_status;
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to)   where.date[Op.lte] = to;
  }
  if (search) {
    where[Op.or] = [
      { debit_note_number: { [Op.like]: `%${search}%` } },
      { reference_bill:    { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await DebitNote.findAndCountAll({
    where,
    include: [
      { model: Vendor,       as: "vendor", attributes: ["id", "name"] },
      { model: DebitNoteLine, as: "lines" },
    ],
    order: [["date", "DESC"], ["id", "DESC"]],
    limit:  parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return {
    total:       count,
    page:        parseInt(page),
    limit:       parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data:        rows,
  };
};

const getById = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const note = await DebitNote.findOne({
    where,
    include: [
      { model: Vendor,        as: "vendor",    attributes: ["id", "name", "phone"] },
      { model: DebitNoteLine, as: "lines" },
      { model: User,          as: "CreatedBy", attributes: ["id", "name"] },
    ],
  });
  if (!note) throw new AppError("Debit note not found", 404);
  return note;
};

const create = async (data, user_id) => {
  const { store_id, date, vendor_id, reference_bill, currency, notes, lines, payment_status } = data;
  if (!Array.isArray(lines) || !lines.length) {
    throw new AppError("Debit note must have at least one line item", 400);
  }

  const subtotal = lines.reduce((s, l) => s + parseFloat(l.amount || 0), 0);

  return sequelize.transaction(async (t) => {
    // Generate number inside transaction to avoid race conditions
    const debit_note_number = await _generateNoteNumber(store_id, date, t);

    const note = await DebitNote.create(
      {
        store_id,
        debit_note_number,
        date,
        vendor_id:      vendor_id      || null,
        reference_bill: reference_bill || null,
        payment_status: payment_status || "Outstanding",
        currency:       currency       || "INR",
        notes:          notes          || null,
        subtotal,
        created_by: user_id,
      },
      { transaction: t },
    );

    await DebitNoteLine.bulkCreate(
      lines.map((l) => ({
        debit_note_id: note.id,
        description:   l.description,
        qty:           l.qty    || 1,
        rate:          l.rate   || 0,
        amount:        l.amount || 0,
      })),
      { transaction: t },
    );

    // Update vendor balance and sub-ledger
    if (vendor_id) {
      await Vendor.decrement("balance", {
        by: subtotal,
        where: { id: vendor_id },
        transaction: t,
      });

      await ledger.writeEntries([
        {
          store_id, party_type: "supplier", party_id: vendor_id,
          transaction_type: "debit_note", reference_type: "debit_note",
          reference_id: note.id, debit: subtotal, credit: 0,
          description: `Debit Note ${debit_note_number}`,
          transaction_date: date || new Date(), created_by: user_id,
        },
        {
          store_id, party_type: "inventory",
          transaction_type: "debit_note", reference_type: "debit_note",
          reference_id: note.id, debit: 0, credit: subtotal,
          description: `Purchase return — ${debit_note_number}`,
          transaction_date: date || new Date(), created_by: user_id,
        },
      ], t);
    }

    // Formal double-entry JE (non-fatal — won't crash if accounts missing)
    await fLedger.postNamedJE({
      store_id,
      reference_type: "debit_note",
      reference_id:   note.id,
      date,
      description:    `Debit Note ${debit_note_number}`,
      namedLines: [
        { mappingKey: "default_creditor", debit: subtotal, credit: 0 },
        { mappingKey: "stock_in_hand",    debit: 0,        credit: subtotal },
      ],
      user_id,
    }, t);

    // Reduce the linked purchase's outstanding balance so AP stays accurate
    if (reference_bill) {
      const linkedPurchase = await Purchase.findOne({
        where: { store_id, purchase_number: reference_bill },
        transaction: t,
      });
      if (linkedPurchase) {
        const new_due    = Math.max(0, parseFloat(linkedPurchase.due_amount) - subtotal);
        const new_paid   = parseFloat(linkedPurchase.total_amount) - new_due;
        const new_status = new_due <= 0 ? "paid" : new_paid > 0 ? "partial" : "unpaid";
        await linkedPurchase.update(
          { due_amount: new_due, paid_amount: new_paid, payment_status: new_status },
          { transaction: t },
        );
      }
    }

    return note;
  });
};

const updateStatus = async (id, payment_status, user_id, store_id) => {
  const note = await getById(id, store_id);

  const oldStatus = note.payment_status;
  await sequelize.transaction(async (t) => {
    await note.update({ payment_status }, { transaction: t });

    // When marking Paid: supplier actually refunded/paid us back (cash in)
    if (payment_status === "Settled" && oldStatus !== "Settled") {
      const subtotal = parseFloat(note.subtotal);

      if (note.vendor_id) {
        // Restore vendor balance (atomic increment)
        await Vendor.increment("balance", {
          by: subtotal,
          where: { id: note.vendor_id },
          transaction: t,
        });

        // Operational ledger: cash increases, supplier debit is cleared
        await ledger.writeEntries([
          {
            store_id, party_type: "cash",
            transaction_type: "debit_note_settled", reference_type: "debit_note",
            reference_id: note.id, debit: subtotal, credit: 0,
            description: `Vendor refund received: ${note.debit_note_number}`,
            transaction_date: new Date(), created_by: user_id,
          },
          {
            store_id, party_type: "supplier", party_id: note.vendor_id,
            transaction_type: "debit_note_settled", reference_type: "debit_note",
            reference_id: note.id, debit: 0, credit: subtotal,
            description: `Debit note settled: ${note.debit_note_number}`,
            transaction_date: new Date(), created_by: user_id,
          },
        ], t);

        // JE: Dr Cash (received from supplier), Cr Default Creditor (cancel the debit)
        await fLedger.postNamedJE({
          store_id,
          reference_type: "debit_note_settled",
          reference_id:   note.id,
          date:           new Date(),
          description:    `Debit Note ${note.debit_note_number} — vendor refund received`,
          namedLines: [
            { mappingKey: "cash_account",     debit: subtotal, credit: 0 },
            { mappingKey: "default_creditor", debit: 0,        credit: subtotal },
          ],
          user_id,
        }, t);
      }
    }
  });

  return getById(id, store_id);
};

module.exports = { getAll, getById, create, updateStatus };
