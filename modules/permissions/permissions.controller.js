"use strict";

const svc = require("./permissions.service");

exports.getAll = async (req, res, next) => {
  try {
    const data = await svc.getAll(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const data = await svc.getById(id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getGrouped = async (req, res, next) => {
  try {
    const data = await svc.getGrouped();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
