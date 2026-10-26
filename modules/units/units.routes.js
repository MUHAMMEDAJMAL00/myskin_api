"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./units.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./units.validation");

router.use(authenticate);

// Unit CRUD
router.get("/",     authorize("units", "read"),   controller.getAll);
router.post("/",    authorize("units", "create"),  validate(schema.createUnit),   controller.create);
router.get("/:id",  authorize("units", "read"),   controller.getOne);
router.put("/:id",  authorize("units", "update"),  validate(schema.updateUnit),   controller.update);
router.delete("/:id", authorize("units", "delete"), controller.remove);

// UOM Values
router.get("/:id/values",             authorize("units", "read"),   controller.getValues);
router.post("/:id/values",            authorize("units", "create"),  validate(schema.createUomValue), controller.addValue);
router.delete("/:id/values/:valueId", authorize("units", "delete"), controller.removeValue);

module.exports = router;
