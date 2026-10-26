"use strict";

const express = require("express");
const router = express.Router();
const vendorReturnsController = require("./vendorReturns.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./vendorReturns.validation");

router.use(authenticate);

router.get("/",                         authorize("vendor_returns", "read"),   vendorReturnsController.getAll);
router.post("/",                        authorize("vendor_returns", "create"), validate(schema.createVendorReturn), vendorReturnsController.create);
router.get("/products/:vendor_id",      authorize("vendor_returns", "read"),   vendorReturnsController.getVendorProducts);
router.get("/:id",                      authorize("vendor_returns", "read"),   vendorReturnsController.getById);
router.patch("/:id/status",             authorize("vendor_returns", "update"), vendorReturnsController.updateStatus);
router.delete("/:id",                   authorize("vendor_returns", "delete"), vendorReturnsController.reverse);

module.exports = router;
