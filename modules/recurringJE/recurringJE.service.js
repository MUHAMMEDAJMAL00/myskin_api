"use strict";

const { Op } = require("sequelize");
const { RecurringJE, RecurringJELine, LedgerAccount, Store, User, Notification, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const jeSvc = require("../journalEntries/journalEntries.service");

// ─── Compute next run date based on frequency ──────────────────────────────────
const computeNextRunDate = (current, frequency, day_of_month, day_of_week) => {
  const d = new Date(current);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly": {
      const targetDay = day_of_month || d.getDate();
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(targetDay, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      break;
    }
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
};

// ─── Get All ──────────────────────────────────────────────────────────────────
const getAll = async (store_id, filters = {}) => {
  const { page = 1, limit = 20, search, is_active, frequency } = filters;
  const where = {};
  if (store_id != null) where.store_id = store_id;
  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active, 10);
  if (frequency) where.frequency = frequency;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await RecurringJE.findAndCountAll({
    where,
    include: [
      { model: RecurringJELine, as: "lines", include: [{ model: LedgerAccount, as: "ledger_account", attributes: ["id", "name"] }] },
      { model: User, as: "CreatedBy", attributes: ["id", "name"] },
    ],
    order: [["next_run_date", "ASC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / parseInt(limit)), data: rows };
};

// ─── Get By ID ────────────────────────────────────────────────────────────────
const getById = async (id, store_id, t = null) => {
  const where = { id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const rje = await RecurringJE.findOne({
    where,
    include: [
      { model: RecurringJELine, as: "lines", include: [{ model: LedgerAccount, as: "ledger_account", attributes: ["id", "name"] }] },
      { model: User, as: "CreatedBy", attributes: ["id", "name"] },
    ],
    transaction: t,
  });
  if (!rje) throw new AppError("Recurring journal entry not found", 404);
  return rje;
};

// ─── Create ───────────────────────────────────────────────────────────────────
const create = async (data, user_id) => {
  const { store_id, name, description, frequency, day_of_month, day_of_week, start_date, end_date, notes, lines } = data;

  if (!lines || lines.length < 2) throw new AppError("At least 2 lines are required", 400);

  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new AppError(`Lines are unbalanced: debit ${totalDebit} ≠ credit ${totalCredit}`, 400);
  }

  // Validate all ledger accounts belong to the store
  const lineAccountIds = lines.map((l) => l.ledger_account_id);
  const validAccounts = await LedgerAccount.findAll({
    where: { id: { [Op.in]: lineAccountIds }, store_id, is_active: 1 },
    attributes: ["id"],
  });
  if (validAccounts.length !== new Set(lineAccountIds).size) {
    throw new AppError("One or more ledger accounts do not belong to this store", 400);
  }

  // First run: today if start_date is past, otherwise start_date
  const today = new Date().toISOString().slice(0, 10);
  const nextRunDate = start_date <= today ? today : start_date;

  return sequelize.transaction(async (t) => {
    const rje = await RecurringJE.create({
      store_id, name, description: description || null,
      frequency, day_of_month: day_of_month || null, day_of_week: day_of_week || null,
      start_date, end_date: end_date || null,
      next_run_date: nextRunDate, notes: notes || null,
      created_by: user_id, is_active: 1,
    }, { transaction: t });

    await RecurringJELine.bulkCreate(
      lines.map((l) => ({
        recurring_je_id: rje.id,
        ledger_account_id: l.ledger_account_id,
        debit: parseFloat(l.debit || 0),
        credit: parseFloat(l.credit || 0),
        description: l.description || null,
      })),
      { transaction: t },
    );

    return getById(rje.id, store_id, t);
  });
};

// ─── Update ───────────────────────────────────────────────────────────────────
const update = async (id, data, user_id, store_id) => {
  const rje = await getById(id, store_id);
  const { name, description, frequency, day_of_month, day_of_week, start_date, end_date, notes, is_active, lines } = data;

  return sequelize.transaction(async (t) => {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (frequency !== undefined) updates.frequency = frequency;
    if (day_of_month !== undefined) updates.day_of_month = day_of_month;
    if (day_of_week !== undefined) updates.day_of_week = day_of_week;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (notes !== undefined) updates.notes = notes;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length > 0 || (lines && lines.length >= 2)) {
      // Recompute next_run_date if relevant fields changed
      if (frequency !== undefined || start_date !== undefined || day_of_month !== undefined) {
        const freq = frequency || rje.frequency;
        const dom = day_of_month !== undefined ? day_of_month : rje.day_of_month;
        const dow = day_of_week !== undefined ? day_of_week : rje.day_of_week;
        const sd = start_date || rje.start_date;
        const baseDate = sd ? new Date(sd) : new Date();
        updates.next_run_date = computeNextRunDate(new Date(Math.max(baseDate, new Date())), freq, dom, dow);
      }
    }

    if (Object.keys(updates).length > 0) {
      await rje.update(updates, { transaction: t });
    }

    if (lines && lines.length >= 2) {
      const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
      const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.005) {
        throw new AppError(`Lines are unbalanced: debit ${totalDebit} ≠ credit ${totalCredit}`, 400);
      }
      await RecurringJELine.destroy({ where: { recurring_je_id: id }, transaction: t });
      await RecurringJELine.bulkCreate(
        lines.map((l) => ({
          recurring_je_id: id,
          ledger_account_id: l.ledger_account_id,
          debit: parseFloat(l.debit || 0),
          credit: parseFloat(l.credit || 0),
          description: l.description || null,
        })),
        { transaction: t },
      );
    }

    return getById(id, store_id, t);
  });
};

// ─── Delete (soft) ────────────────────────────────────────────────────────────
const remove = async (id, store_id) => {
  const rje = await getById(id, store_id);
  await rje.update({ is_active: 0 });
  return { message: "Recurring journal entry deactivated" };
};

// ─── Get Due (Without Posting) ─────────────────────────────────────────────────
const getDueJEs = async (store_id) => {
  const today = new Date().toISOString().slice(0, 10);
  const where = {
    is_active: 1,
    next_run_date: { [Op.lte]: today },
    start_date: { [Op.lte]: today },
    [Op.or]: [
      { end_date: null },
      { end_date: { [Op.gte]: today } },
    ],
  };
  if (store_id) where.store_id = store_id;

  const due = await RecurringJE.findAll({
    where,
    include: [
      { model: RecurringJELine, as: "lines", include: [{ model: LedgerAccount, as: "ledger_account", attributes: ["id", "name"] }] },
    ],
    order: [["next_run_date", "ASC"]],
  });

  return due.filter((r) => r.lines && r.lines.length >= 2).map((r) => ({
    id: r.id,
    name: r.name,
    frequency: r.frequency,
    day_of_month: r.day_of_month,
    next_run_date: r.next_run_date,
    lines: r.lines.map((l) => ({
      ledger_account_id: l.ledger_account_id,
      account_name: l.ledger_account ? l.ledger_account.name : "—",
      debit: parseFloat(l.debit || 0),
      credit: parseFloat(l.credit || 0),
      description: l.description,
    })),
  }));
};

// ─── Generate Due Journal Entries ─────────────────────────────────────────────
const generateDueJEs = async (store_id) => {
  const today = new Date().toISOString().slice(0, 10);
  const due = await RecurringJE.findAll({
    where: {
      is_active: 1,
      next_run_date: { [Op.lte]: today },
      start_date: { [Op.lte]: today },
      [Op.or]: [
        { end_date: null },
        { end_date: { [Op.gte]: today } },
      ],
      ...(store_id ? { store_id } : {}),
    },
    include: [
      { model: RecurringJELine, as: "lines" },
    ],
  });

  const generated = [];
  for (const rje of due) {
    if (!rje.lines || rje.lines.length < 2) continue;

    try {
      const jeLines = rje.lines.map((l) => ({
        ledger_account_id: l.ledger_account_id,
        debit: parseFloat(l.debit || 0),
        credit: parseFloat(l.credit || 0),
        description: l.description || rje.name,
      }));

      await sequelize.transaction(async (t) => {
        const locked = await RecurringJE.findByPk(rje.id, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!locked || !locked.is_active) return;
        if (String(locked.next_run_date) !== String(rje.next_run_date)) return;

        await jeSvc.postJournalEntry({
          store_id: rje.store_id,
          date: today,
          description: `${rje.name} — Recurring JE (${today})`,
          reference_type: "recurring_je",
          reference_id: rje.id,
          lines: jeLines,
          is_manual: 0,
          created_by: rje.created_by,
        }, t);

        const newNextRun = computeNextRunDate(
          new Date(rje.next_run_date),
          rje.frequency,
          rje.day_of_month,
          rje.day_of_week,
        );

        await locked.update({
          last_run_date: today,
          next_run_date: newNextRun,
        }, { transaction: t });
      });

      generated.push({ id: rje.id, name: rje.name, date: today });
    } catch (err) {
      console.error(`Failed to generate recurring JE #${rje.id} (${rje.name}):`, err.message);
      try {
        await Notification.create({
          store_id: rje.store_id, user_id: rje.created_by,
          type: "system", title: "Recurring JE Failed",
          message: `${rje.name}: ${err.message}`,
          reference_type: "recurring_je", reference_id: rje.id,
        });
      } catch (_) {}
    }
  }

  return { generated: generated.length, entries: generated };
};

module.exports = { getAll, getById, create, update, remove, getDueJEs, generateDueJEs };
