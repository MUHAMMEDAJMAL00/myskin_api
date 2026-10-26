"use strict";

const service = require("./auditLog.service");

exports.getAll = async (req, res, next) => {
  try {
    const filters = {
      store_id: req.storeId,
      module: req.query.module || null,
      action: req.query.action || null,
      user_id: req.query.user_id || null,
      from: req.query.from || null,
      to: req.query.to || null,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };
    const data = await service.getAll(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await service.getOne(req.params.id, req.storeId);
    if (!data) return res.status(404).json({ success: false, message: "Audit log not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getModules = async (req, res, next) => {
  try {
    const data = await service.getModules(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
