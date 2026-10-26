"use strict";

const purchasesService = require("./purchases.service");

const getAll = async (req, res, next) => {
  try {
    const { vendor_id, page = 1, limit = 20, search, status, payment_status } = req.query;
    const store_id = req.storeId;
    const result = await purchasesService.getAllPurchases({ store_id, vendor_id, page, limit, search, status, payment_status });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await purchasesService.getPurchaseById(req.params.id, null, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await purchasesService.createPurchase({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = await purchasesService.updatePurchaseStatus(
      req.params.id,
      req.body,
      req.user.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const addPayment = async (req, res, next) => {
  try {
    const data = await purchasesService.addPaymentToPurchase(
      req.params.id,
      req.body,
      req.user.id,
      req.storeId,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getItems = async (req, res, next) => {
  try {
    const purchase = await purchasesService.getPurchaseById(req.params.id, null, req.storeId);
    res.json({ success: true, data: purchase.items || [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, getItems, create, updateStatus, addPayment };
