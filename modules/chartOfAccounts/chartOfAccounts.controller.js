"use strict";

const svc = require("./chartOfAccounts.service");

// ─── Account Categories ────────────────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const data = await svc.getAllCategories(req.storeId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const data = await svc.getCategoryById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await svc.createCategory({ ...req.body, store_id: req.storeId });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await svc.updateCategory(req.params.id, req.body, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const data = await svc.deleteCategory(req.params.id, req.storeId);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

// ─── Ledger Accounts ──────────────────────────────────────────────────────────
exports.getAllAccounts = async (req, res, next) => {
  try {
    const data = await svc.getAllAccounts(req.storeId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAccountById = async (req, res, next) => {
  try {
    const data = await svc.getAccountById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createAccount = async (req, res, next) => {
  try {
    const data = await svc.createAccount({ ...req.body, store_id: req.storeId }, req.user?.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateAccount = async (req, res, next) => {
  try {
    const data = await svc.updateAccount(req.params.id, req.body, req.storeId, req.user?.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const data = await svc.deleteAccount(req.params.id, req.storeId);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

exports.getAccountBalance = async (req, res, next) => {
  try {
    const data = await svc.getAccountBalance(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
