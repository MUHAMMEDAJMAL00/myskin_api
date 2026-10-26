"use strict";
const service = require("./barcode.service");

exports.scan = async (req, res, next) => {
  try {
    const data = await service.scan(req.params.barcode, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.findBySku = async (req, res, next) => {
  try {
    const data = await service.findBySku(req.params.sku, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.search = async (req, res, next) => {
  try {
    const data = await service.search(req.query.q, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
