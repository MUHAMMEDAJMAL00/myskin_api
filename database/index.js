"use strict";

const sequelize = require("../config/database");

// --- Import all models --------------------------------------------------------
const Store = require("../modules/stores/stores.model")(sequelize);
const Role = require("../modules/roles/roles.model")(sequelize);
const Permission = require("../modules/permissions/permissions.model")(
  sequelize,
);
const RolePermission = require("../modules/roles/role_permissions.model")(
  sequelize,
);
const User = require("../modules/users/users.model")(sequelize);
const UserStoreAssign =
  require("../modules/users/user_store_assignments.model")(sequelize);
const AppConfig = require("../modules/config/app_config.model")(sequelize);
const Category = require("../modules/categories/categories.model")(sequelize);
const Product = require("../modules/products/products.model")(sequelize);
const ProductBarcode = require("../modules/products/product_barcodes.model")(
  sequelize,
);
const ProductInventory =
  require("../modules/inventory/product_inventory.model")(sequelize);
const ProductBatch = require("../modules/inventory/product_batches.model")(
  sequelize,
);
const StockMovement = require("../modules/inventory/stock_movements.model")(
  sequelize,
);
const Vendor = require("../modules/vendors/vendors.model")(sequelize);
const Customer = require("../modules/customers/customers.model")(sequelize);
const LoyaltyTransaction =
  require("../modules/customers/loyalty_transactions.model")(sequelize);
const Sale = require("../modules/sales/sales.model")(sequelize);
const SaleItem = require("../modules/sales/sale_items.model")(sequelize);
const SalePayment = require("../modules/sales/sale_payments.model")(sequelize);
const Quotation = require("../modules/quotations/quotations.model")(sequelize);
const QuotationItem = require("../modules/quotations/quotation_items.model")(
  sequelize,
);
const Purchase = require("../modules/purchases/purchases.model")(sequelize);
const PurchaseItem = require("../modules/purchases/purchase_items.model")(
  sequelize,
);
const PurchasePayment = require("../modules/purchases/purchase_payments.model")(
  sequelize,
);
const Return = require("../modules/returns/returns.model")(sequelize);
const ReturnItem = require("../modules/returns/return_items.model")(sequelize);
const CashRegister = require("../modules/cash/cash_register.model")(sequelize);
const CashMovement = require("../modules/cash/cash_movement.model")(sequelize);
const Notification = require("../modules/notifications/notifications.model")(
  sequelize,
);
const AuditLog = require("../modules/auditLog/audit_log.model")(sequelize);
const CustomerPayment =
  require("../modules/customerPayments/customer_payments.model")(sequelize);
const SupplierPayment =
  require("../modules/supplierPayments/supplier_payments.model")(sequelize);
const Wastage = require("../modules/wastage/wastage.model")(sequelize);
const VendorReturn = require("../modules/vendorReturns/vendor_returns.model")(
  sequelize,
);

const QuotationVersion =
  require("../modules/quotations/quotation_version.model")(sequelize);

const RefreshToken = require("../modules/auth/refresh_token.model")(sequelize);
const StoreProductPrice = require("../modules/products/store_product_price.model")(sequelize);

// --- NEW MODULES --------------------------------------------------------------
const Discount = require("../modules/discounts/discounts.model")(sequelize);
const DiscountTier = require("../modules/discounts/discount_tier.model")(
  sequelize,
);
// ✔ NEW: Offer management models for production-grade discount system
const OfferProduct = require("../modules/discounts/offer_product.model")(
  sequelize,
);
const OfferConflict = require("../modules/discounts/offer_conflict.model")(
  sequelize,
);
const OfferAuditLog = require("../modules/discounts/offer_audit_log.model")(
  sequelize,
);
const ExpenseCategory = require("../modules/expenses/expense_category.model")(
  sequelize,
);
const Expense = require("../modules/expenses/expenses.model")(sequelize);
const Unit = require("../modules/units/units.model")(sequelize);
const UomValue = require("../modules/units/uom_value.model")(sequelize);
const TaxGroup = require("../modules/taxes/tax_group.model")(sequelize);
// ✔ NEW: Product variant support
const ProductVariant = require("../modules/products/product_variant.model")(
  sequelize,
);
// Barcode audit trail
const BarcodeChangeLog = require("../modules/products/barcode_change_log.model")(
  sequelize,
);

// Shared account ledger
const AccountLedger = require("../modules/accountLedger/account_ledger.model")(sequelize);

// Purchase returns
const PurchaseReturn = require("../modules/purchaseReturns/purchase_returns.model")(sequelize);
const PurchaseReturnItem = require("../modules/purchaseReturns/purchase_return_items.model")(sequelize);
const Employee = require("../modules/employees/employees.model")(sequelize);
const SalaryPayment = require("../modules/employees/salary_payment.model")(sequelize);

// Accounting & Payroll modules
const AccountCategory  = require("../modules/chartOfAccounts/account_category.model")(sequelize);
const LedgerAccount    = require("../modules/chartOfAccounts/ledger_account.model")(sequelize);
const JournalEntry     = require("../modules/journalEntries/journal_entry.model")(sequelize);
const JournalEntryLine = require("../modules/journalEntries/journal_entry_line.model")(sequelize);
const ContraVoucher    = require("../modules/contraVouchers/contra_voucher.model")(sequelize);
const CreditNote       = require("../modules/creditNotes/credit_note.model")(sequelize);
const CreditNoteLine   = require("../modules/creditNotes/credit_note_line.model")(sequelize);
const DebitNote        = require("../modules/debitNotes/debit_note.model")(sequelize);
const DebitNoteLine    = require("../modules/debitNotes/debit_note_line.model")(sequelize);
const Asset            = require("../modules/assets/asset.model")(sequelize);
const PayrollRun       = require("../modules/payroll/payroll_run.model")(sequelize);
const PayrollRunLine   = require("../modules/payroll/payroll_run_line.model")(sequelize);
const PayrollAdvance   = require("../modules/payroll/payroll_advance.model")(sequelize);
const PaymentSource    = require("../modules/paymentSources/payment_source.model")(sequelize);
const RecurringJE      = require("../modules/recurringJE/recurring_je.model")(sequelize);
const RecurringJELine  = require("../modules/recurringJE/recurring_je_line.model")(sequelize);
const LedgerAccountMapping = require("../modules/shared/ledger_account_mapping.model")(sequelize);

// Customer auth
const CustomerRefreshToken = require("../modules/customer-auth/customer_refresh_token.model")(sequelize);

// Customer cart, wishlist, address
const CustomerCart = require("../modules/customer-cart/cart.model")(sequelize);
const CustomerWishlist = require("../modules/customer-wishlist/wishlist.model")(sequelize);
const CustomerAddress = require("../modules/customer-address/address.model")(sequelize);

// --- Collect all models -------------------------------------------------------
const models = {
  RefreshToken,
  StoreProductPrice,
  Store,
  Role,
  Permission,
  RolePermission,
  User,
  UserStoreAssign,
  AppConfig,
  Category,
  Product,
  ProductBarcode,
  ProductInventory,
  ProductBatch,
  // ✔ NEW: Product variants
  ProductVariant,
  StockMovement,
  Vendor,
  Customer,
  LoyaltyTransaction,
  Sale,
  SaleItem,
  SalePayment,
  Quotation,
  QuotationItem,
  QuotationVersion,
  Purchase,
  PurchaseItem,
  PurchasePayment,
  Return,
  ReturnItem,
  CashRegister,
  CashMovement,
  Notification,
  AuditLog,
  CustomerPayment,
  SupplierPayment,
  // New modules
  Discount,
  DiscountTier,
  // ✔ NEW: Offer management
  OfferProduct,
  OfferConflict,
  OfferAuditLog,
  ExpenseCategory,
  Expense,
  Unit,
  UomValue,
  TaxGroup,
  Wastage,
  VendorReturn,
  BarcodeChangeLog,
  AccountLedger,
  PurchaseReturn,
  PurchaseReturnItem,
  Employee,
  SalaryPayment,
  // Accounting & Payroll
  AccountCategory,
  LedgerAccount,
  JournalEntry,
  JournalEntryLine,
  ContraVoucher,
  CreditNote,
  CreditNoteLine,
  DebitNote,
  DebitNoteLine,
  Asset,
  PayrollRun,
  PayrollRunLine,
  PayrollAdvance,
  PaymentSource,
  RecurringJE,
  RecurringJELine,
  LedgerAccountMapping,
  CustomerRefreshToken,
  CustomerCart,
  CustomerWishlist,
  CustomerAddress,
};

// --- Run all associations -----------------------------------------------------
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

// --- Export models + sequelize instance ---------------------------------------
module.exports = {
  sequelize,
  ...models,
};
