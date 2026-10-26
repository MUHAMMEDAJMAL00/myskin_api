"use strict";

const categoryService = require("./categories.service");

const getAll = async (req, res, next) => {
  try {
    const { page, limit = 20, search, is_active, parent_id, exclude_id } = req.query;
    const result = await categoryService.getAllCategories({ page, limit, search, is_active, parent_id, exclude_id, storeId: req.storeId, filterByStore: true });
    if (Array.isArray(result)) {
      res.json({ success: true, data: result });
    } else {
      res.json({ success: true, ...result });
    }
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id, req.storeId);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory({ ...req.body, store_id: req.storeId });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body,
      req.storeId,
    );
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(req.params.id, req.storeId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const uploadImage = (req, res, next) => {
  const { uploadCategoryImage } = require("../../middleware/upload");
  uploadCategoryImage(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ success: false, message: "No image file uploaded" });
    const url = "/uploads/categories/" + req.file.filename;
    res.json({ success: true, data: { url } });
  });
};

module.exports = { getAll, getOne, create, update, remove, uploadImage };
