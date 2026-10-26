"use strict";

const svc = require("./accountLedger.service");

exports.getLedger = async (req, res, next) => {
  try {
    const { party_type, party_id, from, to } = req.query;
    const data = await svc.getLedger({ store_id: req.storeId, party_type, party_id, from, to });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getBalance = async (req, res, next) => {
  try {
    const { party_type, party_id } = req.query;
    const data = await svc.getBalance({ store_id: req.storeId, party_type, party_id });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createAdjustment = async (req, res, next) => {
  try {
    const data = await svc.createAdjustment({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
