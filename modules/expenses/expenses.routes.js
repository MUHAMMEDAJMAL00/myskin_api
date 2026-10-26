"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./expenses.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./expenses.validations");

router.use(authenticate);

// ── Expense Categories ────────────────────────────────────────────────────────
router.get(
  "/categories",
  authorize("expenses", "read"),
  controller.getAllCategories,
);
router.post(
  "/categories",
  authorize("expenses", "create"),
  validate(schema.createCategory),
  controller.createCategory,
);
router.get(
  "/categories/:id",
  authorize("expenses", "read"),
  controller.getCategoryById,
);
router.patch(
  "/categories/:id",
  authorize("expenses", "update"),
  validate(schema.updateCategory),
  controller.updateCategory,
);
router.delete(
  "/categories/:id",
  authorize("expenses", "delete"),
  controller.deleteCategory,
);

// ── Expenses ──────────────────────────────────────────────────────────────────
router.get("/summary", authorize("expenses", "read"), controller.getSummary);
router.get("/", authorize("expenses", "read"), controller.getAll);
router.post(
  "/",
  authorize("expenses", "create"),
  validate(schema.createExpense),
  controller.create,
);
router.get("/:id", authorize("expenses", "read"), controller.getOne);
router.patch(
  "/:id",
  authorize("expenses", "update"),
  validate(schema.updateExpense),
  controller.update,
);
router.delete("/:id", authorize("expenses", "delete"), controller.remove);

module.exports = router;
