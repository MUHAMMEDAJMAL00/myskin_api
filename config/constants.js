module.exports = {
  // User roles
  ROLES: {
    ADMIN: "admin",
    STORE_KEEPER: "store_keeper",
    CASHIER: "cashier",
  },

  // Sale status
  SALE_STATUS: {
    DRAFT: "draft",
    PENDING: "pending",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    RETURNED: "returned",
    PARTIAL_RETURN: "partial_return",
  },

  // Online order workflow status
  ORDER_WORKFLOW: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
  },

  // Purchase status
  PURCHASE_STATUS: {
    ORDERED: "ordered",
    PARTIAL: "partial",
    RECEIVED: "received",
    CANCELLED: "cancelled",
  },

  // Payment status
  PAYMENT_STATUS: {
    UNPAID: "unpaid",
    PARTIAL: "partial",
    PAID: "paid",
  },

  // Payment methods
  PAYMENT_METHODS: {
    CASH: "cash",
    CARD: "card",
    UPI: "upi",
    LOYALTY_POINTS: "loyalty_points",
    CREDIT: "credit",
    CHEQUE: "cheque",
    BANK_TRANSFER: "bank_transfer",
  },

  // Quotation status
  QUOTATION_STATUS: {
    PENDING: "pending",
    CONVERTED: "converted",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
  },

  // Return status
  RETURN_STATUS: {
    PENDING: "pending",
    COMPLETED: "completed",
    REJECTED: "rejected",
  },

  // Stock movement types
  MOVEMENT_TYPES: {
    PURCHASE: "purchase",
    SALE: "sale",
    RETURN: "return",
    ADJUSTMENT: "adjustment",
    TRANSFER_IN: "transfer_in",
    TRANSFER_OUT: "transfer_out",
  },

  // Discount types
  DISCOUNT_TYPES: {
    NONE: "none",
    PERCENT: "percent",
    FIXED: "fixed",
  },

  // Loyalty transaction types
  LOYALTY_TYPES: {
    EARNED: "earned",
    REDEEMED: "redeemed",
    EXPIRED: "expired",
    ADJUSTED: "adjusted",
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
};
