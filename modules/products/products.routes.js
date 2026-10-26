"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./products.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const schema = require("./products.validation");

router.use(authenticate);

// ─── Static / action routes MUST come before /:id ────────────────────────────
// POS barcode scan: GET /products/lookup?barcode=X&store_id=Y
router.get("/lookup", authorize("products", "read"), controller.lookupBarcode);

// Generate a unique barcode preview: GET /products/generate-barcode
router.get("/generate-barcode", authorize("products", "read"), controller.generateBarcode);

// Barcode print data: POST /products/bulk-barcode-print
router.post("/bulk-barcode-print", authorize("products", "read"), controller.getBulkBarcodePrintData);

// Barcode stock check (for migration planning): GET /products/barcode-stock?barcode=X&store_id=Y
router.get(
  "/barcode-stock",
  authorize("products", "read"),
  controller.barcodeStock,
);
router.post(
  "/upload-image",
  authorize("products", "create"),
  controller.uploadImage,
);
router.get("/import-template", authorize("products", "create"), controller.importProductTemplate);
router.post("/import", authorize("products", "create"), controller.importProducts);

// ─── Product CRUD ─────────────────────────────────────────────────────────────
router.get("/", authorize("products", "read"), controller.getAll);
router.post(
  "/",
  authorize("products", "create"),
  validate(schema.createProduct),
  controller.create,
);

// Bulk price update
router.post(
  "/bulk-price-update",
  authorize("products", "update"),
  validate(schema.bulkPriceUpdate),
  controller.bulkPriceUpdate,
);

router.get("/:id", authorize("products", "read"), controller.getOne);
router.put(
  "/:id",
  authorize("products", "update"),
  validate(schema.updateProduct),
  controller.update,
);
router.delete("/:id", authorize("products", "delete"), controller.remove);

// Offer assignments
router.patch(
  "/:id/offers",
  authorize("products", "update"),
  controller.setOfferAssignments,
);

// Product variant management
router.get(
  "/:id/variants",
  authorize("products", "read"),
  controller.getVariants,
);
router.post(
  "/:id/variants",
  authorize("products", "update"),
  validate(schema.createProductVariant),
  controller.createVariant,
);
router.put(
  "/:id/variants/:vid",
  authorize("products", "update"),
  validate(schema.updateProductVariant),
  controller.updateVariant,
);
router.delete(
  "/:id/variants/:vid",
  authorize("products", "update"),
  controller.removeVariant,
);

// Variant image upload
router.post("/:id/variants/upload-image", authorize("products", "update"), controller.uploadVariantImage);

// ─── Barcode management per product ──────────────────────────────────────────
router.get(
  "/:id/barcodes",
  authorize("products", "read"),
  controller.getBarcodes,
);
router.post(
  "/:id/barcodes",
  authorize("products", "update"),
  validate(schema.addBarcode),
  controller.addBarcode,
);
router.put(
  "/:id/barcodes/:bid",
  authorize("products", "update"),
  validate(schema.updateBarcode),
  controller.updateBarcode,
);
router.delete(
  "/:id/barcodes/:bid",
  authorize("products", "update"),
  controller.removeBarcode,
);
router.get(
  "/:id/barcode-logs",
  authorize("products", "read"),
  controller.getBarcodeLogs,
);

router.get(
  "/:id/all-barcodes",
  authorize("products", "read"),
  controller.getAllBarcodesForPrint,
);

router.get(
  "/:id/barcode-print-data",
  authorize("products", "read"),
  controller.getBarcodePrintData,
);

// ─── Store-Specific Pricing ───────────────────────────────────────────────────
router.get("/:id/price", authorize("products", "read"), controller.getStorePrice);
router.put("/:id/price", authorize("products", "update"), controller.setStorePrice);
router.delete("/:id/price", authorize("products", "update"), controller.removeStorePrice);

module.exports = router;
