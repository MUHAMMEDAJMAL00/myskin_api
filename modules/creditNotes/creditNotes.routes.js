"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./creditNotes.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");

router.use(authenticate);

router.get(  "/",        authorize("credit_notes", "read"),   ctrl.getAll);
router.get(  "/:id",     authorize("credit_notes", "read"),   ctrl.getById);
router.post( "/",        authorize("credit_notes", "create"), ctrl.create);
router.patch("/:id/status", authorize("credit_notes", "update"), ctrl.updateStatus);

module.exports = router;
