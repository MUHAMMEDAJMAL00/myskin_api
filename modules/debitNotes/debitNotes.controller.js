"use strict";

const svc = require("./debitNotes.service");

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

exports.updateStatus = async (req, res, next) => {
  try {
    if (!req.body.payment_status) return res.status(400).json({ success: false, message: "payment_status is required" });
    const data = await svc.updateStatus(req.params.id, req.body.payment_status, req.user.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
