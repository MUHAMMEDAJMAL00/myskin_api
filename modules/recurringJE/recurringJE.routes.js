"use strict";

const express = require("express");
const router = express.Router();
const ctrl = require("./recurringJE.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./recurringJE.validation");

router.use(authenticate);

router.get("/", authorize("recurring_jes", "read"), ctrl.getAll);
router.get("/due", authorize("recurring_jes", "read"), ctrl.getDue);
router.get("/:id", authorize("recurring_jes", "read"), ctrl.getById);
router.post("/", authorize("recurring_jes", "create"), validate(schema.create), ctrl.create);
router.put("/:id", authorize("recurring_jes", "update"), validate(schema.update), ctrl.update);
router.delete("/:id", authorize("recurring_jes", "delete"), ctrl.remove);
router.post("/generate", authorize("recurring_jes", "create"), ctrl.generate);

module.exports = router;
