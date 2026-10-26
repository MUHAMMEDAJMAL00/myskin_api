"use strict";

const express = require("express");
const router  = express.Router();
const ctrl    = require("./assets.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema   = require("./assets.validation");

router.use(authenticate);

router.get( "/",                    authorize("assets", "read"),   ctrl.getAll);
router.get( "/:id",                 authorize("assets", "read"),   ctrl.getById);
router.post("/",                    authorize("assets", "create"), validate(schema.createAsset), ctrl.create);
router.put( "/:id",                 authorize("assets", "update"), ctrl.update);
router.post("/:id/depreciation",    authorize("assets", "update"), validate(schema.postDepreciation), ctrl.postDepreciation);
router.delete("/:id",               authorize("assets", "delete"), ctrl.remove);

module.exports = router;
