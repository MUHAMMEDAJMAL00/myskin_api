"use strict";

const svc = require("./payroll.service");

const summary    = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getSummary(req.storeId, req.query.salary_month) }); }
  catch (e) { next(e); }
};

const listRuns   = async (req, res, next) => {
  try { res.json({ success: true, ...(await svc.getRuns(req.storeId, req.query)) }); }
  catch (e) { next(e); }
};

const getOne     = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getRunById(req.params.id, req.storeId) }); }
  catch (e) { next(e); }
};

const createRun  = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.createRun(req.body, req.user.id, req.storeId) }); }
  catch (e) { next(e); }
};

const bulkRun    = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.createBulkRun(req.body.items, req.user.id, req.storeId) }); }
  catch (e) { next(e); }
};

const listAdv    = async (req, res, next) => {
  try { res.json({ success: true, ...(await svc.getAdvances(req.storeId, req.query)) }); }
  catch (e) { next(e); }
};

const createAdv  = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.createAdvance(req.body, req.user.id, req.storeId) }); }
  catch (e) { next(e); }
};

const cancelRun  = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.cancelRun(req.params.id, req.storeId, req.user.id) }); }
  catch (e) { next(e); }
};

module.exports = { summary, listRuns, getOne, createRun, bulkRun, cancelRun, listAdv, createAdv };
