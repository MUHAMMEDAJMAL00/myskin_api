"use strict";

const { Op } = require("sequelize");
const {
  Expense,
  ExpenseCategory,
  AccountLedger,
  JournalEntry,
  JournalEntryLine,
  Store,
  User,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

// ═══════════════════════════════════════════════════════
//  EXPENSE CATEGORIES
// ═══════════════════════════════════════════════════════

const getAllCategories = async (store_id) => {
  const where = { is_active: 1 };
  if (store_id != null) where.store_id = store_id;
  return ExpenseCategory.findAll({
    where,
    order: [["name", "ASC"]],
  });
};

const getCategoryById = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const category = await ExpenseCategory.findOne({ where });
  if (!category) throw new AppError("Expense category not found", 404);
  return category;
};

const createCategory = async (data, user_id) => {
  const { store_id, name, description } = data;

  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  const existing = await ExpenseCategory.findOne({
    where: { store_id, name, is_active: 1 },
  });
  if (existing) throw new AppError(`Category "${name}" already exists`, 409);

  const category = await ExpenseCategory.create({
    store_id,
    name,
    description: description || null,
  });

  await auditLog.log({
    store_id,
    user_id,
    module: "expenses",
    action: "create",
    reference_type: "expense_category",
    reference_id: category.id,
    new_values: { name },
  });

  return category;
};

const updateCategory = async (id, data, user_id, store_id) => {
  const category = await getCategoryById(id, store_id);
  const old_values = category.toJSON();
  await category.update(data);

  await auditLog.log({
    store_id,
    user_id,
    module: "expenses",
    action: "update",
    reference_type: "expense_category",
    reference_id: id,
    old_values,
    new_values: data,
  });

  return category;
};

const deleteCategory = async (id, user_id, store_id) => {
  const category = await getCategoryById(id, store_id);
  await category.update({ is_active: 0 });

  await auditLog.log({
    store_id,
    user_id,
    module: "expenses",
    action: "delete",
    reference_type: "expense_category",
    reference_id: id,
    old_values: { name: category.name },
  });

  return { message: "Category deleted successfully" };
};

// ═══════════════════════════════════════════════════════
//  EXPENSES
// ═══════════════════════════════════════════════════════

const getAllExpenses = async (store_id, filters = {}) => {
  const { page = 1, limit = 20, category_id, status, payment_method, from, to, search } = filters;
  const where = { is_active: 1 };
  if (store_id != null) where.store_id = store_id;

  if (category_id) where.category_id = category_id;
  if (status) where.status = status;
  if (payment_method) where.payment_method = payment_method;

  if (from || to) {
    where.expense_date = {};
    if (from) where.expense_date[Op.gte] = from;
    if (to) where.expense_date[Op.lte] = to;
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { reference_number: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Expense.findAndCountAll({
    where,
    include: [
      { model: ExpenseCategory, as: "category", attributes: ["id", "name"] },
      { model: User, attributes: ["id", "name"] },
    ],
    order: [["expense_date", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / limit), data: rows };
};

const getExpenseById = async (id, store_id) => {
  const where = { id };
  if (store_id != null) where.store_id = store_id;
  const expense = await Expense.findOne({
    where,
    include: [
      { model: ExpenseCategory, as: "category", attributes: ["id", "name"] },
      { model: User, attributes: ["id", "name"] },
    ],
  });
  if (!expense) throw new AppError("Expense not found", 404);
  return expense;
};

const createExpense = async (data, user_id) => {
  const {
    store_id,
    category_id,
    title,
    description,
    amount,
    payment_method,
    reference_number,
    expense_date,
    receipt_url,
    notes,
    status,
  } = data;

  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  if (category_id) {
    const cat = await ExpenseCategory.findOne({
      where: { id: category_id, store_id, is_active: 1 },
    });
    if (!cat) throw new AppError("Expense category not found", 404);
  }

  const expense = await sequelize.transaction(async (t) => {
    const created = await Expense.create(
      {
        store_id,
        user_id,
        category_id: category_id || null,
        title,
        description: description || null,
        amount,
        payment_method: payment_method || "cash",
        reference_number: reference_number || null,
        expense_date,
        receipt_url: receipt_url || null,
        notes: notes || null,
        status: status || "approved",
      },
      { transaction: t },
    );

    if ((status || "approved") === "approved") {
      await ledger.writeEntries(
        [
          {
            store_id,
            party_type: "expense",
            party_id: category_id || null,
            transaction_type: "expense",
            reference_type: "expense",
            reference_id: created.id,
            debit: amount,
            credit: 0,
            description: title,
            transaction_date: expense_date || new Date(),
            created_by: user_id,
          },
          {
            store_id,
            party_type:
              payment_method === "bank" ||
              payment_method === "card" ||
              payment_method === "upi"
                ? "bank"
                : "cash",
            transaction_type: "expense",
            reference_type: "expense",
            reference_id: created.id,
            debit: 0,
            credit: amount,
            description: title,
            transaction_date: expense_date || new Date(),
            created_by: user_id,
          },
        ],
        t,
      );

      await fLedger.postNamedJE({
        store_id,
        reference_type: "expense",
        reference_id:   created.id,
        date:           expense_date || new Date(),
        description:    `Expense: ${title}`,
        namedLines: [
          { mappingKey: "general_expenses",                           debit: parseFloat(amount), credit: 0 },
          { mappingKey: fLedger.paymentMethodToMappingKey(payment_method), debit: 0, credit: parseFloat(amount) },
        ],
        user_id,
      }, t);
    }

    return created;
  });

  await auditLog.log({
    store_id,
    user_id,
    module: "expenses",
    action: "create",
    reference_type: "expense",
    reference_id: expense.id,
    new_values: { title, amount, expense_date, status: expense.status },
  });

  return getExpenseById(expense.id, store_id);
};

const updateExpense = async (id, data, user_id, store_id) => {
  const expense = await getExpenseById(id, store_id);
  const old_values = expense.toJSON();

  if (data.category_id) {
    const cat = await ExpenseCategory.findOne({
      where: { id: data.category_id, store_id, is_active: 1 },
    });
    if (!cat) throw new AppError("Expense category not found", 404);
  }

  await sequelize.transaction(async (t) => {
    await expense.update(data, { transaction: t });

    const wasApproved = (old_values.status || "approved") === "approved";
    const newStatus   = data.status !== undefined ? data.status : old_values.status;
    const isApproved  = (newStatus || "approved") === "approved";

    // Always clear old ledger + JE entries when updating an approved expense
    if (wasApproved || isApproved) {
      await AccountLedger.destroy({
        where: { reference_type: "expense", reference_id: id },
        transaction: t,
      });

      const oldJes = await JournalEntry.findAll({
        where: { reference_type: "expense", reference_id: id },
        attributes: ["id"],
        transaction: t,
      });
      if (oldJes.length) {
        const jeIds = oldJes.map((je) => je.id);
        await JournalEntryLine.destroy({ where: { journal_entry_id: jeIds }, transaction: t });
        await JournalEntry.destroy({ where: { id: jeIds }, transaction: t });
      }
    }

    // Re-write entries if the updated expense is still approved
    if (isApproved) {
      const amount     = parseFloat(data.amount          ?? old_values.amount);
      const date       = data.expense_date               ?? old_values.expense_date;
      const title      = data.title                      ?? old_values.title;
      const categoryId = data.category_id                ?? old_values.category_id;
      const method     = data.payment_method             ?? old_values.payment_method;
      const moneyType  = method === "bank" || method === "card" || method === "upi" ? "bank" : "cash";

      await ledger.writeEntries([
        {
          store_id,
          party_type: "expense",
          party_id: categoryId || null,
          transaction_type: "expense",
          reference_type: "expense",
          reference_id: id,
          debit: amount,
          credit: 0,
          description: title,
          transaction_date: date || new Date(),
          created_by: user_id,
        },
        {
          store_id,
          party_type: moneyType,
          transaction_type: "expense",
          reference_type: "expense",
          reference_id: id,
          debit: 0,
          credit: amount,
          description: title,
          transaction_date: date || new Date(),
          created_by: user_id,
        },
      ], t);

      await fLedger.postNamedJE({
        store_id,
        reference_type: "expense",
        reference_id:   id,
        date:           date || new Date(),
        description:    `Expense (updated): ${title}`,
        namedLines: [
          { mappingKey: "general_expenses",                   debit: amount, credit: 0 },
          { mappingKey: fLedger.paymentMethodToMappingKey(method), debit: 0, credit: amount },
        ],
        user_id,
      }, t);
    }
  });

  await auditLog.log({
    store_id,
    user_id,
    module: "expenses",
    action: "update",
    reference_type: "expense",
    reference_id: id,
    old_values,
    new_values: data,
  });

  return getExpenseById(id, store_id);
};

const deleteExpense = async (id, user_id, store_id) => {
  const expense = await getExpenseById(id, store_id);

  await sequelize.transaction(async (t) => {
    await expense.update({ is_active: 0 }, { transaction: t });

    await AccountLedger.destroy({
      where: { reference_type: "expense", reference_id: id },
      transaction: t,
    });

    // Also remove the formal JEs so Trial Balance stays clean
    const jes = await JournalEntry.findAll({
      where: { reference_type: "expense", reference_id: id },
      attributes: ["id"],
      transaction: t,
    });
    if (jes.length) {
      const jeIds = jes.map((je) => je.id);
      await JournalEntryLine.destroy({ where: { journal_entry_id: jeIds }, transaction: t });
      await JournalEntry.destroy({ where: { id: jeIds }, transaction: t });
    }
  });

  await auditLog.log({
    store_id,
    user_id,
    module: "expenses",
    action: "delete",
    reference_type: "expense",
    reference_id: id,
    old_values: { title: expense.title, amount: expense.amount },
  });

  return { message: "Expense deleted successfully" };
};

const getExpenseSummary = async (store_id, filters = {}) => {
  const where = { is_active: 1, status: "approved" };
  if (store_id != null) where.store_id = store_id;

  if (filters.from || filters.to) {
    where.expense_date = {};
    if (filters.from) where.expense_date[Op.gte] = filters.from;
    if (filters.to) where.expense_date[Op.lte] = filters.to;
  }

  const expenses = await Expense.findAll({
    where,
    include: [
      { model: ExpenseCategory, as: "category", attributes: ["id", "name"] },
    ],
  });

  const categoryMap = {};
  let grand_total = 0;

  for (const exp of expenses) {
    const cat_name = exp.category ? exp.category.name : "Uncategorized";
    const cat_id = exp.category_id || 0;
    const amount = parseFloat(exp.amount);

    if (!categoryMap[cat_id]) {
      categoryMap[cat_id] = {
        category_id: cat_id,
        category: cat_name,
        total: 0,
        count: 0,
      };
    }
    categoryMap[cat_id].total += amount;
    categoryMap[cat_id].count += 1;
    grand_total += amount;
  }

  return {
    grand_total: Math.round(grand_total * 100) / 100,
    breakdown: Object.values(categoryMap).sort((a, b) => b.total - a.total),
  };
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
