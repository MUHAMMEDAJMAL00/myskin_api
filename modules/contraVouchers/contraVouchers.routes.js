"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./contraVouchers.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema   = require("./contraVouchers.validation");

router.use(authenticate);

router.get( "/",     authorize("contra_vouchers", "read"),   ctrl.getAll);
router.get( "/:id",  authorize("contra_vouchers", "read"),   ctrl.getById);
router.post("/",     authorize("contra_vouchers", "create"), validate(schema.createContraVoucher), ctrl.create);
router.delete("/:id", authorize("contra_vouchers", "delete"), ctrl.cancel);

module.exports = router;
