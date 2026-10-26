"use strict";

const svc = require("./assets.service");

exports.getAll = async (req, res, next) => {
  try {
    const data = await svc.getAll(req.storeId, req.query);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await svc.create({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const data = await svc.update(req.params.id, req.body, req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.postDepreciation = async (req, res, next) => {
  try {
    const data = await svc.postDepreciation(req.params.id, req.body, req.user.id, req.storeId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await svc.deleteAsset(req.params.id, req.storeId);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};
