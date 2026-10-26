"use strict";

const configService = require("./config.service");

const getAll = async (req, res, next) => {
  try {
    const data = await configService.getAllConfigs(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await configService.getConfig(req.params.key, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const set = async (req, res, next) => {
  try {
    const data = await configService.setConfig({ ...req.body, store_id: req.storeId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const bulkSet = async (req, res, next) => {
  try {
    const data = await configService.bulkSetConfig({ configs: req.body.configs, store_id: req.storeId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await configService.deleteConfig(req.params.key, req.storeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, set, bulkSet, remove };
