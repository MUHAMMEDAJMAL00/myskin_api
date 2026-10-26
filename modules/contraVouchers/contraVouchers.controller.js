"use strict";

const svc = require("./contraVouchers.service");

exports.getAll = async (req, res, next) => {
  try {
    const data = await svc.getAll(req.storeId, req.query);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await svc.create({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const data = await svc.cancel(req.params.id, req.storeId, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
