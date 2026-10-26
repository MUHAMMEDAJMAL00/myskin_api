"use strict";

const returnsService = require("./returns.service");

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, refund_method } = req.query;
    const store_id = req.storeId;
    const result = await returnsService.getAllReturns({ store_id, page, limit, search, refund_method });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await returnsService.getReturnById(req.params.id, null, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await returnsService.createReturn(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = await returnsService.updateReturnStatus(req.params.id, status, req.user.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, updateStatus };
