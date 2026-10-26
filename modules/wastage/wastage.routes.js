"use strict";

const express = require("express");
const router = express.Router();
const wastageController = require("./wastage.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./wastage.validation");

router.use(authenticate);

router.get("/",    authorize("wastages", "read"),   wastageController.getAll);
router.post("/",   authorize("wastages", "create"), validate(schema.createWastage), wastageController.create);
router.delete("/:id", authorize("wastages", "delete"), wastageController.reverse);

module.exports = router;
