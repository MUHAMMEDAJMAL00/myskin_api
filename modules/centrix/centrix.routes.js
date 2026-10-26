const express = require("express");
const router = express.Router();
const controller = require("./centrix.controller");
const { authenticate } = require("../../middleware/auth");

router.use(authenticate);

router.post("/send-message", controller.sendMessage);
router.post("/send-invoice", controller.sendInvoice);
router.post("/send-bulk", controller.sendBulkMessage);
router.get("/token-status", controller.getTokenStatus);

module.exports = router;
