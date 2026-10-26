"use strict";
const svc = require("./paymentSources.service");

exports.getAll = async (req, res, next) => {
  try {
    const include_inactive = req.query.include_inactive === "true";
    const data = await svc.getAll({ include_inactive });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await svc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const data = await svc.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const data = await svc.toggleActive(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await svc.remove(req.params.id);
    res.json({ success: true, message: "Payment source deleted" });
  } catch (err) { next(err); }
};
