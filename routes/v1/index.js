"use strict";

const express = require("express");
const router = express.Router();
const dashboardRoutes = require("../../modules/dashboard/dashboard.routes");

const notificationRoutes = require("../../modules/notifications/notifications.routes");
const auditLogRoutes = require("../../modules/auditLog/auditLog.routes");
const customerPaymentRoutes = require("../../modules/customerPayments/customerPayments.routes");

// Auth
router.use("/auth", require("../../modules/auth/auth.routes"));
router.use("/customer-auth", require("../../modules/customer-auth/customer-auth.routes"));
router.use("/customer-cart", require("../../modules/customer-cart/cart.routes"));
router.use("/customer-wishlist", require("../../modules/customer-wishlist/wishlist.routes"));
router.use("/customer-address", require("../../modules/customer-address/address.routes"));

// Core
router.use("/stores", require("../../modules/stores/stores.routes"));
router.use("/users", require("../../modules/users/users.routes"));
router.use("/roles", require("../../modules/roles/roles.routes"));
router.use(
  "/permissions",
  require("../../modules/permissions/permissions.routes"),
);
router.use("/config", require("../../modules/config/config.routes"));

// Catalog
router.use(
  "/categories",
  require("../../modules/categories/categories.routes"),
);
router.use("/products", require("../../modules/products/products.routes"));
router.use("/inventory", require("../../modules/inventory/inventory.routes"));

// Public storefront (unauthenticated reads for customer-facing clients like myskin_web)
router.use("/storefront", require("../../modules/storefront/storefront.routes"));

// Parties
router.use("/vendors", require("../../modules/vendors/vendors.routes"));
router.use("/customers", require("../../modules/customers/customers.routes"));
router.use("/employees", require("../../modules/employees/employees.routes"));

// Transactions
router.use("/sales", require("../../modules/sales/sales.routes"));
router.use("/purchases", require("../../modules/purchases/purchases.routes"));
router.use(
  "/quotations",
  require("../../modules/quotations/quotations.routes"),
);
router.use("/returns", require("../../modules/returns/returns.routes"));

// Reports
router.use("/reports", require("../../modules/reports/reports.routes"));

// Cash Management
router.use("/cash", require("../../modules/cash/cash.routes"));

router.use("/gst", require("../../modules/gst/gst.routes"));
router.use("/dashboard", dashboardRoutes);

router.use("/notifications", notificationRoutes);
router.use("/audit-log", auditLogRoutes);

router.use("/customer-payments", customerPaymentRoutes);
router.use(
  "/supplier-payments",
  require("../../modules/supplierPayments/supplierPayments.routes"),
);

router.use("/barcode", require("../../modules/barcode/barcode.routes"));
router.use("/discounts", require("../../modules/discounts/discounts.routes"));
router.use("/expenses", require("../../modules/expenses/expenses.routes"));
router.use("/units", require("../../modules/units/units.routes"));
router.use("/taxes", require("../../modules/taxes/tax-group.routes"));
router.use("/wastages", require("../../modules/wastage/wastage.routes"));
router.use("/vendor-returns", require("../../modules/vendorReturns/vendorReturns.routes"));
router.use("/account-ledger", require("../../modules/accountLedger/accountLedger.routes"));
router.use("/purchase-returns", require("../../modules/purchaseReturns/purchaseReturns.routes"));

// Centrix Integration
router.use("/centrix", require("../../modules/centrix/centrix.routes"));

// Accounting & Payroll
router.use("/chart-of-accounts",  require("../../modules/chartOfAccounts/chartOfAccounts.routes"));
router.use("/journal-entries",    require("../../modules/journalEntries/journalEntries.routes"));
router.use("/contra-vouchers",    require("../../modules/contraVouchers/contraVouchers.routes"));
router.use("/credit-notes",       require("../../modules/creditNotes/creditNotes.routes"));
router.use("/debit-notes",        require("../../modules/debitNotes/debitNotes.routes"));
router.use("/assets",             require("../../modules/assets/assets.routes"));
router.use("/payroll",            require("../../modules/payroll/payroll.routes"));
router.use("/payment-sources",    require("../../modules/paymentSources/paymentSources.routes"));
router.use("/recurring-jes",     require("../../modules/recurringJE/recurringJE.routes"));

module.exports = router;
