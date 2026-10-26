"use strict";

const { Op } = require("sequelize");
const { CreditNote, CreditNoteLine, Customer, Sale, User, AccountLedger, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

const _generateNoteNumber = async (store_id, date, t = null) => {
  const d = typeof date === "string" ? date : (date instanceof Date ? date.toISOString() : new Date().toISOString());
  const month  = d.slice(0, 7).replace("-", "");
  const prefix = `CN-${month}-`;
  const opts   = t ? { transaction: t, lock: t.LOCK.UPDATE } : {};
  const last   = await CreditNote.findOne({
    where: { store_id, credit_note_number: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
    attributes: ["credit_note_number"],
    ...opts,
  });
  let seq = 1;
  if (last && last.credit_note_number) {
    const parts = last.credit_note_number.split("-");
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
      { credit_note_number: { [Op.like]: `%${search}%` } },
      { reference_invoice:  { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await CreditNote.findAndCountAll({
    where,
    include: [
      { model: Customer,       as: "customer", attributes: ["id", "name"] },
      { model: CreditNoteLine, as: "lines" },
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
  const note = await CreditNote.findOne({
    where,
    include: [
      { model: Customer,       as: "customer",  attributes: ["id", "name", "phone"] },
      { model: CreditNoteLine, as: "lines" },
      { model: User,           as: "CreatedBy", attributes: ["id", "name"] },
    ],
  });
  if (!note) throw new AppError("Credit note not found", 404);
  return note;
};

const create = async (data, user_id) => {
  const { store_id, date, customer_id, reference_invoice, currency, notes, lines, payment_status } = data;
  if (!Array.isArray(lines) || !lines.length) {
    throw new AppError("Credit note must have at least one line item", 400);
  }

  const subtotal = lines.reduce((s, l) => s + parseFloat(l.amount || 0), 0);

  return sequelize.transaction(async (t) => {
    // Generate number inside transaction to avoid race conditions
    const credit_note_number = await _generateNoteNumber(store_id, date, t);

    const note = await CreditNote.create(
      {
        store_id,
        credit_note_number,
        date,
        customer_id:       customer_id       || null,
        reference_invoice: reference_invoice || null,
        payment_status:    payment_status    || "Outstanding",
        currency:          currency          || "INR",
        notes:             notes             || null,
        subtotal,
        created_by: user_id,
      },
      { transaction: t },
    );

    await CreditNoteLine.bulkCreate(
      lines.map((l) => ({
        credit_note_id: note.id,
        description:    l.description,
        qty:            l.qty    || 1,
        rate:           l.rate   || 0,
        amount:         l.amount || 0,
      })),
      { transaction: t },
    );

    // Update customer balance and sub-ledger
    if (customer_id) {
      await Customer.increment("balance", {
        by: subtotal,
        where: { id: customer_id },
        transaction: t,
      });

      await ledger.writeEntries([
        {
          store_id, party_type: "customer", party_id: customer_id,
          transaction_type: "credit_note", reference_type: "credit_note",
          reference_id: note.id, debit: 0, credit: subtotal,
          description: `Credit Note ${credit_note_number}`,
          transaction_date: date || new Date(), created_by: user_id,
        },
        {
          store_id, party_type: "sales",
          transaction_type: "credit_note", reference_type: "credit_note",
          reference_id: note.id, debit: subtotal, credit: 0,
          description: `Sales return — ${credit_note_number}`,
          transaction_date: date || new Date(), created_by: user_id,
        },
      ], t);
    }

    // Formal double-entry JE (non-fatal — won't crash if accounts missing)
    await fLedger.postNamedJE({
      store_id,
      reference_type: "credit_note",
      reference_id:   note.id,
      date,
      description:    `Credit Note ${credit_note_number}`,
      namedLines: [
        { mappingKey: "sale_return",    debit: subtotal, credit: 0 },
        { mappingKey: "default_debtor", debit: 0,        credit: subtotal },
      ],
      user_id,
    }, t);

    // Reduce the linked sale's outstanding balance so AR stays accurate
    if (reference_invoice) {
      const linkedSale = await Sale.findOne({
        where: { store_id, invoice_number: reference_invoice },
        transaction: t,
      });
      if (linkedSale) {
        const new_due  = Math.max(0, parseFloat(linkedSale.due_amount) - subtotal);
        const new_paid = parseFloat(linkedSale.total_amount) - new_due;
        await linkedSale.update({ due_amount: new_due, paid_amount: new_paid }, { transaction: t });
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

    // When marking Paid: the store refunded the customer (cash out)
    if (payment_status === "Settled" && oldStatus !== "Settled") {
      const subtotal = parseFloat(note.subtotal);

      if (note.customer_id) {
        // Decrease customer balance (credit consumed)
        await Customer.decrement("balance", {
          by: subtotal,
          where: { id: note.customer_id },
          transaction: t,
        });

        // Operational ledger: cash decreases, customer credit is cleared
        await ledger.writeEntries([
          {
            store_id, party_type: "cash",
            transaction_type: "credit_note_settled", reference_type: "credit_note",
            reference_id: note.id, debit: 0, credit: subtotal,
            description: `Refund paid for ${note.credit_note_number}`,
            transaction_date: new Date(), created_by: user_id,
          },
          {
            store_id, party_type: "customer", party_id: note.customer_id,
            transaction_type: "credit_note_settled", reference_type: "credit_note",
            reference_id: note.id, debit: subtotal, credit: 0,
            description: `Credit note settled: ${note.credit_note_number}`,
            transaction_date: new Date(), created_by: user_id,
          },
        ], t);

        // JE: Dr Default Debtor (cancel the receivable), Cr Cash (paid out)
        await fLedger.postNamedJE({
          store_id,
          reference_type: "credit_note_settled",
          reference_id:   note.id,
          date:           new Date(),
          description:    `Credit Note ${note.credit_note_number} — refund paid`,
          namedLines: [
            { mappingKey: "default_debtor", debit: subtotal, credit: 0 },
            { mappingKey: "cash_account",  debit: 0,        credit: subtotal },
          ],
          user_id,
        }, t);
      }
    }
  });

  return getById(id, store_id);
};

module.exports = { getAll, getById, create, updateStatus };
