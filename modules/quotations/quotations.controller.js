"use strict";

const quotationsService = require("./quotations.service");

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const store_id = req.storeId;
    const result = await quotationsService.getAllQuotations({ store_id, page, limit, search, status });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await quotationsService.getQuotationById(req.params.id, null, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await quotationsService.createQuotation(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await quotationsService.updateQuotation(
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

const updateStatus = async (req, res, next) => {
  try {
    const data = await quotationsService.updateQuotationStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.storeId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getVersions = async (req, res, next) => {
  try {
    const data = await quotationsService.getQuotationVersions(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const convertToSale = async (req, res, next) => {
  try {
    const data = await quotationsService.convertToSale(
      req.params.id,
      req.body,
      req.user.id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, updateStatus, getVersions, convertToSale };
