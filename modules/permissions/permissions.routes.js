"use strict";

const express = require("express");
const router = express.Router();
const ctrl = require("./permissions.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./permissions.validation");

router.use(authenticate);

router.get("/",         authorize("permissions", "read"), ctrl.getAll);
router.get("/grouped",  authorize("permissions", "read"), ctrl.getGrouped);
router.get("/:id",      authorize("permissions", "read"), ctrl.getById);

module.exports = router;
