"use strict";

const inventoryService = require("./inventory.service");

const getAll = async (req, res, next) => {
  try {
    const { type, product_id, page = 1, limit = 20, search } = req.query;
    const store_id = parseInt(req.query.store_id) || req.storeId || null;
    if (type === "batches") {
      const data = await inventoryService.getAllBatches({
        store_id,
        product_id,
        page,
        limit,
        search,
      });
      return res.json({ success: true, ...data });
    }
    const result = await inventoryService.getAllInventory(
      store_id,
      page,
      limit,
      search,
      product_id,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getByProduct = async (req, res, next) => {
  try {
    const store_id = parseInt(req.query.store_id) || req.storeId || null;
    const data = await inventoryService.getProductInventory(
      req.params.product_id,
      store_id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getLowStock = async (req, res, next) => {
  try {
    const store_id = parseInt(req.query.store_id) || req.storeId || null;
    const data = await inventoryService.getLowStock(store_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const adjust = async (req, res, next) => {
  try {
    const store_id = parseInt(req.body.store_id) || parseInt(req.query.store_id) || req.storeId || null;
    const data = await inventoryService.adjustStock({ ...req.body, store_id }, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const transfer = async (req, res, next) => {
  try {
    const data = await inventoryService.transferStock(req.body, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getMovements = async (req, res, next) => {
  try {
    const { product_id, page = 1, limit = 20, movement_type } = req.query;
    const store_id = parseInt(req.query.store_id) || req.storeId || null;
    const result = await inventoryService.getMovements(
      product_id,
      store_id,
      page,
      limit,
      movement_type,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getByProduct,
  getLowStock,
  adjust,
  transfer,
  getMovements,
};
