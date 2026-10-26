"use strict";

const salesService = require("./sales.service");

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, payment_status, from, to, source } = req.query;
    const store_id = req.storeId;
    const result = await salesService.getAllSales({ store_id, page, limit, search, status, payment_status, from, to, source });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await salesService.getSaleById(req.params.id, null, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const storeId = req.storeId || req.body.store_id;
    const data = await salesService.createSale({ ...req.body, store_id: storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = await salesService.updateSaleStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.storeId,
      req.body.notes,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getByInvoice = async (req, res, next) => {
  try {
    const data = await salesService.getByInvoiceNumber(
      req.params.invoice_number,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const addPayment = async (req, res, next) => {
  try {
    const data = await salesService.addPaymentToSale(
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

const getStats = async (req, res, next) => {
  try {
    const { from, to, status, source } = req.query;
    const store_id = req.storeId;
    const data = await salesService.getSalesStats({ store_id, from, to, status, source });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, getByInvoice, create, updateStatus, addPayment, getStats };
