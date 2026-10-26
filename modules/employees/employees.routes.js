"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./employees.controller");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const schema = require("./employees.validation");

router.use(authenticate);

// Static routes must come before /:id to avoid param capture
router.get("/salary-status",   authorize("expenses", "read"), controller.salaryStatusAll);
router.get("/salary-payments", authorize("expenses", "read"), controller.paymentHistory);

router.get("/", authorize("users", "read"), controller.getAll);
router.get("/:id", authorize("users", "read"), controller.getOne);
router.post("/", authorize("users", "create"), validate(schema.createEmployee), controller.create);
router.put("/:id", authorize("users", "update"), validate(schema.updateEmployee), controller.update);
router.post("/:id/salary", authorize("expenses", "create"), validate(schema.paySalary), controller.paySalary);
router.get("/:id/salary-summary", authorize("expenses", "read"), controller.salarySummary);

module.exports = router;
