"use strict";

const service = require("./expenses.service");

// ── Categories ────────────────────────────────────────────────────────────────
const getAllCategories = async (req, res, next) => {
  try {
    const data = await service.getAllCategories(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const data = await service.getCategoryById(
      parseInt(req.params.id),
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const data = await service.createCategory({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const data = await service.updateCategory(
      parseInt(req.params.id),
      req.body,
      req.user.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const data = await service.deleteCategory(
      parseInt(req.params.id),
      req.user.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Expenses ──────────────────────────────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      category_id: req.query.category_id,
      status: req.query.status,
      payment_method: req.query.payment_method,
      from: req.query.from,
      to: req.query.to,
      search: req.query.search,
    };
    const result = await service.getAllExpenses(req.storeId, filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await service.getExpenseById(
      parseInt(req.params.id),
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.createExpense({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.updateExpense(
      parseInt(req.params.id),
      req.body,
      req.user.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const data = await service.deleteExpense(
      parseInt(req.params.id),
      req.user.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const filters = { from: req.query.from, to: req.query.to };
    const data = await service.getExpenseSummary(req.storeId, filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAll,
  getOne,
  create,
  update,
  remove,
  getSummary,
};
