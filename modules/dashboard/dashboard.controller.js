"use strict";

const service = require("./dashboard.service");

exports.getSummary = async (req, res, next) => {
  try {
    const data = await service.getSummary(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getLowStock = async (req, res, next) => {
  try {
    const data = await service.getLowStock(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getTopProducts = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await service.getTopProducts(req.storeId, days);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getRecentSales = async (req, res, next) => {
  try {
    const data = await service.getRecentSales(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
