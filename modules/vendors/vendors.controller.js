"use strict";

const vendorsService = require("./vendors.service");
const auditLog = require("../auditLog/auditLog.service");

const getAll = async (req, res, next) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const result = await vendorsService.getAllVendors({ search, is_active, page, limit, storeId: req.storeId });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await vendorsService.getVendorById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await vendorsService.createVendor({ ...req.body, store_id: req.storeId });
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "vendors", action: "create", reference_type: "vendor", reference_id: data.id, new_values: { name: data.name, company: data.company, phone: data.phone }, ip_address: req.ip });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await vendorsService.updateVendor(req.params.id, req.body, req.storeId);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "vendors", action: "update", reference_type: "vendor", reference_id: parseInt(req.params.id), new_values: req.body, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await vendorsService.deleteVendor(req.params.id, req.storeId);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "vendors", action: "delete", reference_type: "vendor", reference_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getPurchases = async (req, res, next) => {
  try {
    const data = await vendorsService.getVendorPurchases(
      req.params.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const data = await vendorsService.getVendorPayments(
      req.params.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const recalcBalance = async (req, res, next) => {
  try {
    const { recalcVendorBalance } = require("../../utils/recalcBalance");
    const balance = await recalcVendorBalance(req.params.id, req.storeId);
    res.json({ success: true, data: { vendor_id: req.params.id, balance } });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove, getPurchases, getPayments, recalcBalance };
