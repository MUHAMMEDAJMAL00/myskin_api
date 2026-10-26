"use strict";

const express = require("express");
const router  = express.Router();
const svc     = require("./purchaseReturns.service");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema   = require("./purchaseReturns.validation");

router.use(authenticate);

// GET /purchase-returns?vendor_id=2&status=completed
router.get("/", authorize("purchases", "read"), async (req, res, next) => {
  try {
    const { vendor_id, status, page, limit, search } = req.query;
    const store_id = req.storeId;
    const result = await svc.getAll({ store_id, vendor_id, status, page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /purchase-returns/vendor/:vendor_id/purchases  — purchases with returnable items
router.get("/vendor/:vendor_id/purchases", authorize("purchases", "read"), async (req, res, next) => {
  try {
    const data = await svc.getPurchasesWithRemainingItems(req.params.vendor_id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /purchase-returns/purchase/:purchase_id/items  — pre-fill from original purchase
router.get("/purchase/:purchase_id/items", authorize("purchases", "read"), async (req, res, next) => {
  try {
    const data = await svc.getPurchaseItems(req.params.purchase_id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /purchase-returns/:id
router.get("/:id", authorize("purchases", "read"), async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /purchase-returns
router.post("/", authorize("purchases", "create"), validate(schema.createPurchaseReturn), async (req, res, next) => {
  try {
    const data = await svc.create({ ...req.body, store_id: req.storeId }, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PATCH /purchase-returns/:id/status
router.patch("/:id/status", authorize("purchases", "update"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });
    const data = await svc.updateStatus(req.params.id, status, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
