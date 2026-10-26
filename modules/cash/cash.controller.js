"use strict";

const cashService = require("./cash.service");

const getAll = async (req, res, next) => {
  try {
    const data = await cashService.getAllRegisters(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await cashService.getRegisterById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getActive = async (req, res, next) => {
  try {
    const data = await cashService.getActiveRegister(req.storeId);
    res.json({ success: true, data: data || null });
  } catch (err) {
    next(err);
  }
};

const open = async (req, res, next) => {
  try {
    const data = await cashService.openRegister(
      { ...req.body, store_id: req.storeId },
      req.user.id,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const close = async (req, res, next) => {
  try {
    const data = await cashService.closeRegister(
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

const suggestedOpening = async (req, res, next) => {
  try {
    const data = await cashService.getSuggestedOpening(req.storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const movement = async (req, res, next) => {
  try {
    const data = await cashService.addMovement(
      req.params.id,
      req.body,
      req.user.id,
      req.storeId,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const pettyCash = async (req, res, next) => {
  try {
    const data = await cashService.addPettyCashExpense(
      req.params.id,
      req.body,
      req.user.id,
      req.storeId,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const dailySummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const data = await cashService.getDailySummary(req.storeId, date);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const shiftSummary = async (req, res, next) => {
  try {
    const data = await cashService.getShiftSummary(req.storeId, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getOne,
  getActive,
  open,
  close,
  movement,
  pettyCash,
  dailySummary,
  shiftSummary,
  suggestedOpening,
};
