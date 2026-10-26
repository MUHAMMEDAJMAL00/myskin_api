"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./chartOfAccounts.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema   = require("./chartOfAccounts.validation");

router.use(authenticate);

// Account Categories
router.get(   "/categories",     authorize("account_categories", "read"),   ctrl.getAllCategories);
router.get(   "/categories/:id", authorize("account_categories", "read"),   ctrl.getCategoryById);
router.post(  "/categories",     authorize("account_categories", "create"), validate(schema.createCategory), ctrl.createCategory);
router.put(   "/categories/:id", authorize("account_categories", "update"), validate(schema.updateCategory), ctrl.updateCategory);
router.delete("/categories/:id", authorize("account_categories", "delete"), ctrl.deleteCategory);

// Ledger Accounts
router.get(   "/accounts",           authorize("ledger_accounts", "read"),   ctrl.getAllAccounts);
router.get(   "/accounts/:id",       authorize("ledger_accounts", "read"),   ctrl.getAccountById);
router.get(   "/accounts/:id/balance", authorize("ledger_accounts", "read"), ctrl.getAccountBalance);
router.post(  "/accounts",           authorize("ledger_accounts", "create"), validate(schema.createAccount), ctrl.createAccount);
router.put(   "/accounts/:id",       authorize("ledger_accounts", "update"), validate(schema.updateAccount), ctrl.updateAccount);
router.delete("/accounts/:id",       authorize("ledger_accounts", "delete"), ctrl.deleteAccount);

module.exports = router;
