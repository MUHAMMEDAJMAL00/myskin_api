"use strict";

const wastageService = require("./wastage.service");

const create = async (req, res, next) => {
  try {
    const data = await wastageService.createWastage({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await wastageService.getWastages({ store_id: req.storeId, page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const reverse = async (req, res, next) => {
  try {
    const data = await wastageService.reverseWastage(req.params.id, req.user.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  getAll,
  reverse,
};
