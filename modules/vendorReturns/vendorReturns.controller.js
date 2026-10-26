"use strict";

const vendorReturnService = require("./vendorReturns.service");

const create = async (req, res, next) => {
  try {
    const data = await vendorReturnService.createReturn({ ...req.body, store_id: req.storeId }, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await vendorReturnService.getReturns({ ...req.query, store_id: req.storeId });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await vendorReturnService.getReturnById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });
    const data = await vendorReturnService.updateStatus(req.params.id, status, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const reverse = async (req, res, next) => {
  try {
    const data = await vendorReturnService.reverseReturn(req.params.id, req.user.id, req.storeId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getVendorProducts = async (req, res, next) => {
  try {
    const data = await vendorReturnService.getVendorProducts(req.params.vendor_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  updateStatus,
  reverse,
  getVendorProducts,
};
