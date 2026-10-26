"use strict";

const unitsService = require("./units.service");
const _s = (req) => req.storeId;

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const result = await unitsService.getAllUnits({ page, limit, search, is_active, store_id: _s(req) });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await unitsService.getUnitById(req.params.id, _s(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await unitsService.createUnit({ ...req.body, store_id: req.storeId || null });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await unitsService.updateUnit(req.params.id, req.body, _s(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await unitsService.deleteUnit(req.params.id, _s(req));
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ── UOM Values ────────────────────────────────────────────────────────────────

const getValues = async (req, res, next) => {
  try {
    const data = await unitsService.getUnitValues(req.params.id, _s(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const addValue = async (req, res, next) => {
  try {
    const data = await unitsService.addUnitValue(req.params.id, req.body.value, _s(req));
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const removeValue = async (req, res, next) => {
  try {
    const result = await unitsService.removeUnitValue(req.params.id, req.params.valueId, _s(req));
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove, getValues, addValue, removeValue };
