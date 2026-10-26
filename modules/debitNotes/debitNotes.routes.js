"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./debitNotes.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");

router.use(authenticate);

router.get(  "/",           authorize("debit_notes", "read"),   ctrl.getAll);
router.get(  "/:id",        authorize("debit_notes", "read"),   ctrl.getById);
router.post( "/",           authorize("debit_notes", "create"), ctrl.create);
router.patch("/:id/status", authorize("debit_notes", "update"), ctrl.updateStatus);

module.exports = router;
