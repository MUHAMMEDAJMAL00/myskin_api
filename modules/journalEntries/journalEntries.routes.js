"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./journalEntries.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema   = require("./journalEntries.validation");

router.use(authenticate);

router.get(  "/",                                     authorize("journal_entries", "read"),   ctrl.getAll);
router.get(  "/general-ledger",                        authorize("journal_entries", "read"),   ctrl.getGeneralLedger);
router.get(  "/account-statement/:account_id",        authorize("journal_entries", "read"),   ctrl.getAccountStatement);
router.get(  "/:id",                                  authorize("journal_entries", "read"),   ctrl.getById);
router.post( "/",                                     authorize("journal_entries", "create"), validate(schema.createJournalEntry), ctrl.create);

module.exports = router;
