"use strict";

const svc = require("./employees.service");

exports.getAll = async (req, res, next) => {
  try {
    const data = await svc.getAll({ ...req.query, store_id: req.storeId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await svc.create({ ...req.body, store_id: req.storeId });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await svc.update(req.params.id, req.body, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.paySalary = async (req, res, next) => {
  try {
    const data = await svc.paySalary(req.params.id, req.body, req.user.id, req.storeId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.salarySummary = async (req, res, next) => {
  try {
    const data = await svc.getSalarySummary(req.params.id, req.query.salary_month, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.salaryStatusAll = async (req, res, next) => {
  try {
    const data = await svc.getSalaryStatusAll({ ...req.query, store_id: req.storeId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.paymentHistory = async (req, res, next) => {
  try {
    const data = await svc.getPaymentHistory({ ...req.query, store_id: req.storeId });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};
