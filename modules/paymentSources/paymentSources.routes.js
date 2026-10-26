const express = require("express");
const router = express.Router();
const ctrl = require("./paymentSources.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./paymentSources.validation");

router.use(authenticate);

router.get("/",             authorize("payment_sources", "read"),    ctrl.getAll);
router.get("/:id",          authorize("payment_sources", "read"),    ctrl.getById);
router.post("/",            authorize("payment_sources", "create"),  validate(schema.create),   ctrl.create);
router.put("/:id",          authorize("payment_sources", "update"),  validate(schema.update),   ctrl.update);
router.patch("/:id/toggle", authorize("payment_sources", "update"),  ctrl.toggleActive);
router.delete("/:id",       authorize("payment_sources", "delete"),  ctrl.remove);

module.exports = router;
