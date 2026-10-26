"use strict";

const storesService = require("./stores.service");
const { createStore, updateStore } = require("./stores.validation");
const AppError = require("../../utils/AppError");

const getAll = async (req, res, next) => {
  try {
    if (req.storeId) {
      const store = await storesService.getStoreById(req.storeId);
      return res.json({ success: true, total: store ? 1 : 0, total_pages: 1, page: 1, data: store ? [store] : [] });
    }
    const { page = 1, limit = 20, search, is_active } = req.query;
    const result = await storesService.getAllStores({ page, limit, search, is_active });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const store = await storesService.getStoreById(req.params.id);
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    if (!req.isSuperAdmin) {
      throw new AppError("Only super administrators can create stores. Please contact your system administrator.", 403);
    }
    const { error, value } = createStore.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);
    const store = await storesService.createStore(value);
    res.status(201).json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateStore.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);
    const store = await storesService.updateStore(req.params.id, value);
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await storesService.deleteStore(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await storesService.getStoreUsers(req.params.id);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, getUsers };
