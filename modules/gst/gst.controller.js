"use strict";

const gstService = require("./gst.service");
const printService = require("./print.service");
const AppError = require("../../utils/AppError");

const getSaleGST = async (req, res, next) => {
  try {
    const data = await gstService.getSaleGST(req.params.sale_id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getGSTR1 = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) throw new AppError("month and year are required", 400);
    const data = await gstService.getGSTR1({
      store_id: req.storeId,
      month: parseInt(month),
      year: parseInt(year),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    if (!from_date || !to_date) throw new AppError("from_date and to_date are required", 400);
    const data = await gstService.getGSTSummary({
      store_id: req.storeId,
      from_date,
      to_date,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const printInvoice = async (req, res, next) => {
  try {
    await printService.generateInvoicePDF(req.params.sale_id, req.storeId, res);
  } catch (err) {
    next(err);
  }
};

const printReceipt = async (req, res, next) => {
  try {
    await printService.generateReceiptPDF(req.params.sale_id, req.storeId, res);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSaleGST, getGSTR1, getSummary, printInvoice, printReceipt };
