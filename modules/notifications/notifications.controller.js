"use strict";

const service = require("./notifications.service");

exports.getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.storeId, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getUnread = async (req, res, next) => {
  try {
    const data = await service.getUnread(req.storeId, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await service.markRead(req.params.id, req.user.id, req.storeId);
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await service.markAllRead(req.storeId, req.user.id);
    res.json({ success: true, message: "All marked as read" });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.id, req.storeId);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const data = await service.generateAlerts(req.storeId, req.user.id);
    res.json({ success: true, message: "Alerts generated", data });
  } catch (err) {
    next(err);
  }
};
