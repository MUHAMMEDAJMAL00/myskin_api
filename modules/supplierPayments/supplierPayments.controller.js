"use strict";
const service = require("./supplierPayments.service");

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await service.getAll({ store_id: req.storeId, page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.getDueVendors = async (req, res, next) => {
  try {
    const data = await service.getDueVendors(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getByVendor = async (req, res, next) => {
  try {
    const data = await service.getByVendor(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getDuePurchases = async (req, res, next) => {
  try {
    const data = await service.getDuePurchases(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await service.getOne(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getLedger = async (req, res, next) => {
  try {
    const data = await service.getLedger(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
