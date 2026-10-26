"use strict";

const { Discount } = require("../../database/index");
const service = require("./discount.service");

const getAll = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      is_active: req.query.is_active,
      discount_type: req.query.discount_type,
      apply_to: req.query.apply_to,
      search: req.query.search,
    };
    const result = await service.getAllDiscounts(store_id, filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─── GET /discounts/active ────────────────────────────────────────────────────
const getActive = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const data = await service.getActiveDiscounts(store_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /discounts/:id ───────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const data = await service.getDiscountById(
      parseInt(req.params.id),
      store_id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /discounts ──────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const user_id = req.user.id;
    const data = await service.createDiscount(
      { ...req.body, store_id }, // ← fix: inject into data
      user_id,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /discounts/:id ─────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const user_id = req.user.id;
    const data = await service.updateDiscount(
      parseInt(req.params.id),
      req.body,
      user_id,
      store_id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /discounts/:id ────────────────────────────────────────────────────
const remove = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const user_id = req.user.id;
    const data = await service.deleteDiscount(
      parseInt(req.params.id),
      user_id,
      store_id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /discounts/apply ────────────────────────────────────────────────────
const apply = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const data = await service.validateDiscountCode(
      { ...req.body, store_id }, // ← fix: inject into data
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /discounts/:id/reset-usage ────────────────────────────────────────
const resetUsage = async (req, res, next) => {
  try {
    const store_id = req.storeId;
    const id = parseInt(req.params.id);
    await service.getDiscountById(id, store_id); // verify ownership
    await Discount.update({ usage_count: 0 }, { where: { id, store_id } });
    res.json({ success: true, message: "Usage count reset to 0" });
  } catch (err) { next(err); }
};

module.exports = { getAll, getActive, getOne, create, update, remove, apply, resetUsage };
