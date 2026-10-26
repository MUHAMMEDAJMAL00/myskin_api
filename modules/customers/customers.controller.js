"use strict";

const customersService = require("./customers.service");
const auditLog = require("../auditLog/auditLog.service");
const AppError = require("../../utils/AppError");

const getAll = async (req, res, next) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const result = await customersService.getAllCustomers({ search, is_active, page, limit, storeId: req.storeId });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await customersService.getCustomerById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await customersService.createCustomer({ ...req.body, store_id: req.storeId });
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "customers", action: "create", reference_type: "customer", reference_id: data.id, new_values: { name: data.name, phone: data.phone, email: data.email }, ip_address: req.ip });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await customersService.updateCustomer(req.params.id, req.body, req.storeId);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "customers", action: "update", reference_type: "customer", reference_id: parseInt(req.params.id), new_values: req.body, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await customersService.deleteCustomer(req.params.id, req.storeId);
    auditLog.log({ store_id: req.storeId, user_id: req.user?.id, module: "customers", action: "delete", reference_type: "customer", reference_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const updateLoyalty = async (req, res, next) => {
  try {
    const { points, notes } = req.body;
    if (points === undefined || points === null || isNaN(Number(points)))
      throw new AppError("Valid points value required", 400);
    const data = await customersService.updateLoyaltyPoints(
      req.params.id,
      parseInt(points),
      notes || null,
      null,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}; // ← closing brace here, BEFORE getLoyaltyHistory

const getLoyaltyHistory = async (req, res, next) => {
  try {
    const data = await customersService.getLoyaltyHistory(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const searchByPhone = async (req, res, next) => {
  try {
    const data = await customersService.searchByPhone(req.query.phone, req.storeId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const recalcBalance = async (req, res, next) => {
  try {
    const { recalcCustomerBalance } = require("../../utils/recalcBalance");
    const balance = await recalcCustomerBalance(req.params.id, req.storeId);
    res.json({ success: true, data: { customer_id: req.params.id, balance } });
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getOne, create, update, remove,
  updateLoyalty, getLoyaltyHistory, searchByPhone,
  recalcBalance,
};
