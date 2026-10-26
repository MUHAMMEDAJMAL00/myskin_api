"use strict";
const service = require("./tax-group.service");

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const result = await service.getAll({ page, limit, search, is_active, store_id: req.storeId });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const group = await service.getById(req.params.id);
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
};

const getActive = async (req, res, next) => {
  try {
    const result = await service.getAll({ page: 1, limit: 200, is_active: 1, store_id: req.storeId });
    res.json({ success: true, data: result.data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, store_id: req.storeId };
    const group = await service.create(data);
    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const group = await service.update(req.params.id, req.body, req.storeId);
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id, req.storeId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, getActive, create, update, remove };
