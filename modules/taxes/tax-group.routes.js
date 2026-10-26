"use strict";
const express = require("express");
const router = express.Router();
const controller = require("./tax-group.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./tax-group.validation");

router.use(authenticate);

router.get("/active", controller.getActive);
router.get("/", authorize("taxes", "read"), controller.getAll);
router.post("/", authorize("taxes", "create"), validate(schema.createTaxGroup), controller.create);
router.get("/:id", authorize("taxes", "read"), controller.getOne);
router.put("/:id", authorize("taxes", "update"), validate(schema.updateTaxGroup), controller.update);
router.delete("/:id", authorize("taxes", "delete"), controller.remove);

module.exports = router;
