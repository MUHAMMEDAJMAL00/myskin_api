"use strict";

const svc = require("./journalEntries.service");

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
    const data = await svc.createManual({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAccountStatement = async (req, res, next) => {
  try {
    const data = await svc.getAccountStatement(req.storeId, req.params.account_id, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getGeneralLedger = async (req, res, next) => {
  try {
    const data = await svc.getGeneralLedger({ store_id: req.storeId, ...req.query });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};
