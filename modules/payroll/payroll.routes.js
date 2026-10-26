"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./payroll.controller");
const { authenticate }  = require("../../middleware/auth");
const { authorize }     = require("../../middleware/rbac");

router.use(authenticate);

router.get( "/summary",         authorize("payroll", "read"),   ctrl.summary);
router.get( "/runs",            authorize("payroll", "read"),   ctrl.listRuns);
router.get( "/runs/:id",        authorize("payroll", "read"),   ctrl.getOne);
router.post("/runs",            authorize("payroll", "create"), ctrl.createRun);
router.post("/runs/bulk",       authorize("payroll", "create"), ctrl.bulkRun);
router.delete("/runs/:id",      authorize("payroll", "delete"), ctrl.cancelRun);
router.get( "/advances",        authorize("payroll", "read"),   ctrl.listAdv);
router.post("/advances",        authorize("payroll", "create"), ctrl.createAdv);

module.exports = router;
