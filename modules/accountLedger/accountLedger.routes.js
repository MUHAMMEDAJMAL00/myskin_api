"use strict";

const express    = require("express");
const router     = express.Router();
const controller = require("./accountLedger.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");

router.use(authenticate);

// GET /account-ledger?party_type=customer&party_id=5&store_id=1&from=2024-01-01&to=2024-12-31
router.get("/", authorize("reports", "read"), controller.getLedger);

// GET /account-ledger/balance?party_type=supplier&party_id=3&store_id=1
router.get("/balance", authorize("reports", "read"), controller.getBalance);

// POST /account-ledger/adjustment
router.post("/adjustment", authorize("reports", "create"), controller.createAdjustment);

module.exports = router;
