"use strict";

const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const ctrl = require("./address.controller");

router.get("/", authenticate, ctrl.getAddresses);
router.post("/", authenticate, ctrl.addAddress);
router.put("/:id", authenticate, ctrl.updateAddress);
router.delete("/:id", authenticate, ctrl.deleteAddress);

module.exports = router;
