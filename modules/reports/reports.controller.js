"use strict";

const reportsService = require("./reports.service");

const resolveStoreId = (req) =>
  req.storeId || (req.user && req.user.store_id) || null;

const _q = (req) => ({ ...req.query, store_id: resolveStoreId(req) });

const getSalesSummary = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getSalesSummary(_q(req)) });
  } catch (err) { next(err); }
};
const getPurchaseSummary = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getPurchaseSummary(_q(req)) });
  } catch (err) { next(err); }
};
const getProfitLoss = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getProfitLoss(_q(req)) });
  } catch (err) { next(err); }
};
const getTopProducts = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getTopProducts(_q(req)) });
  } catch (err) { next(err); }
};
const getTopCustomers = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getTopCustomers(_q(req)) });
  } catch (err) { next(err); }
};
const getInventory = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getInventoryReport(_q(req)) });
  } catch (err) { next(err); }
};
const getLowStock = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getLowStockReport(_q(req)) });
  } catch (err) { next(err); }
};
const getReturns = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getReturnsReport(_q(req)) });
  } catch (err) { next(err); }
};
const getVendors = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getVendorReport(_q(req)) });
  } catch (err) { next(err); }
};
const getDaily = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getDailySummary(_q(req)) });
  } catch (err) { next(err); }
};

const getTrialBalance = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getTrialBalance(_q(req)) });
  } catch (err) { next(err); }
};
const getBalanceSheet = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getBalanceSheet(_q(req)) });
  } catch (err) { next(err); }
};
const getARaging = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getARaging(_q(req)) });
  } catch (err) { next(err); }
};
const getAPaging = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getAPaging(_q(req)) });
  } catch (err) { next(err); }
};

const getGstSummary = async (req, res, next) => {
  try {
    res.json({ success: true, data: await reportsService.getGstSummary(_q(req)) });
  } catch (err) { next(err); }
};

module.exports = {
  getSalesSummary,
  getPurchaseSummary,
  getProfitLoss,
  getTopProducts,
  getTopCustomers,
  getInventory,
  getLowStock,
  getReturns,
  getVendors,
  getDaily,
  getTrialBalance,
  getBalanceSheet,
  getARaging,
  getAPaging,
  getGstSummary,
};
