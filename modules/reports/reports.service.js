"use strict";

const {
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  Return,
  PurchaseReturn,
  VendorReturn,
  Product,
  Customer,
  Vendor,
  Store,
  Unit,
  ProductInventory,
  JournalEntry,
  JournalEntryLine,
  LedgerAccount,
  AccountCategory,
  sequelize,
} = require("../../database/index");
const { Op, fn, col, literal } = require("sequelize");

// ─── Date Filter Helper ───────────────────────────────────────────────────────
const dateFilter = (from, to, field = "created_at") => {
  const filter = {};
  if (from || to) {
    filter[field] = {};
    if (from) filter[field][Op.gte] = from;
    if (to) filter[field][Op.lte] = to + "T23:59:59";
  }
  return filter;
};

// ─── 1. Sales Summary ─────────────────────────────────────────────────────────
const getSalesSummary = async ({ store_id, from, to }) => {
  const where = {
    status: "completed",
    ...dateFilter(from, to, "sale_date"),
  };
  if (store_id) where.store_id = store_id;

  const sales = await Sale.findAll({
    where,
    include: [{ model: Customer, attributes: ["id", "name", "phone"], required: false }],
  });

  const total_sales    = sales.length;
  const total_revenue  = sales.reduce((s, x) => s + parseFloat(x.total_amount || 0),   0);
  const total_tax      = sales.reduce((s, x) => s + parseFloat(x.tax_amount || 0),     0);
  const total_discount = sales.reduce((s, x) => s + parseFloat(x.discount_amount || 0), 0);
  const total_due      = sales.reduce((s, x) => s + parseFloat(x.due_amount || 0),     0);
  const total_cost     = sales.reduce((s, x) => s + parseFloat(x.total_cost || 0), 0);
  const total_profit   = parseFloat(((total_revenue - total_tax) - total_cost).toFixed(2));

  return {
    total_sales, total_revenue, total_tax, total_discount, total_due, total_cost, total_profit,
    sales: sales.map((s) => {
      const json = s.toJSON ? s.toJSON() : s;
      return {
        id: json.id,
        invoice_number: json.invoice_number,
        total_amount: json.total_amount,
        paid_amount: json.paid_amount,
        due_amount: json.due_amount,
        status: json.status,
        sale_date: json.sale_date,
        Customer: json.Customer || null,
      };
    }),
  };
};

// ─── 2. Purchase Summary ──────────────────────────────────────────────────────
const getPurchaseSummary = async ({ store_id, from, to }) => {
  const where = { status: "received", ...dateFilter(from, to, "purchase_date") };
  if (store_id) where.store_id = store_id;

  const purchases = await Purchase.findAll({
    where,
    include: [{ model: Vendor, attributes: ["id", "name", "company"], required: false }],
  });

  const total_purchases = purchases.length;
  const total_cost  = purchases.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
  const total_paid  = purchases.reduce((s, x) => s + parseFloat(x.paid_amount || 0),  0);
  const total_due   = purchases.reduce((s, x) => s + parseFloat(x.due_amount || 0),   0);

  return { total_purchases, total_cost, total_paid, total_due, purchases };
};

// ─── 3. Profit & Loss (from Journal Entries — full picture) ───────────────────
const getProfitLoss = async ({ store_id, from, to }) => {
  const jeWhere = {};
  if (from || to) {
    jeWhere.date = {};
    if (from) jeWhere.date[Op.gte] = new Date(from);
    if (to)   jeWhere.date[Op.lte] = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  if (store_id) jeWhere.store_id = parseInt(store_id);

  // Fetch all JE lines for the period, joined to account + category
  const lines = await JournalEntryLine.findAll({
    include: [
      {
        model: JournalEntry,
        where:    jeWhere,
        required: true,
        attributes: [],
      },
      {
        model: LedgerAccount,
        as:       "ledger_account",
        required: true,
        attributes: ["id", "name"],
        include: [{
          model:    AccountCategory,
          as:       "category",
          required: true,
          attributes: ["name", "group"],
        }],
      },
    ],
    attributes: ["debit", "credit"],
  });

  let revenue  = 0;
  let expenses = 0;
  const revenueBreakdown  = {};
  const expenseBreakdown  = {};

  for (const line of lines) {
    const group   = line.ledger_account?.category?.group;
    const accName = line.ledger_account?.name;
    const debit   = parseFloat(line.debit  || 0);
    const credit  = parseFloat(line.credit || 0);

    if (group === "Income") {
      const net = credit - debit; // credit-normal accounts
      revenue  += net;
      revenueBreakdown[accName] = (revenueBreakdown[accName] || 0) + net;
    } else if (group === "Expenditure") {
      const net = debit - credit; // debit-normal accounts
      expenses += net;
      expenseBreakdown[accName] = (expenseBreakdown[accName] || 0) + net;
    }
  }

  const round = (v) => Math.round(v * 100) / 100;

  return {
    revenue:    round(revenue),
    expenses:   round(expenses),
    net_profit: round(revenue - expenses),
    revenue_breakdown: Object.entries(revenueBreakdown)
      .map(([name, amount]) => ({ name, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    expense_breakdown: Object.entries(expenseBreakdown)
      .map(([name, amount]) => ({ name, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
};

// ─── 4. Top Selling Products ──────────────────────────────────────────────────
const getTopProducts = async ({ store_id, from, to, limit = 10 }) => {
  const saleWhere = {
    status: "completed",
    ...dateFilter(from, to, "sale_date"),
  };
  if (store_id) saleWhere.store_id = store_id;

  return SaleItem.findAll({
    attributes: [
      "product_id",
      "product_name",
      [fn("SUM", col("quantity")),   "total_qty"],
      [fn("SUM", col("total_price")), "total_revenue"],
    ],
    include: [{ model: Sale, attributes: [], where: saleWhere, required: true }],
    group: ["product_id", "product_name"],
    order: [[literal("total_qty"), "DESC"]],
    limit: parseInt(limit),
    raw:   true,
  });
};

// ─── 5. Top Customers ─────────────────────────────────────────────────────────
const getTopCustomers = async ({ store_id, from, to, limit = 10 }) => {
  const where = { status: "completed", ...dateFilter(from, to, "sale_date") };
  if (store_id) where.store_id = store_id;

  return Sale.findAll({
    attributes: [
      "customer_id",
      [fn("COUNT", col("Sale.id")), "total_orders"],
      [fn("SUM",   col("total_amount")), "total_spent"],
    ],
    where: { ...where, customer_id: { [Op.ne]: null } },
    include: [{ model: Customer, attributes: ["id", "name", "phone"], required: true }],
    group: ["customer_id"],
    order: [[literal("total_spent"), "DESC"]],
    limit: parseInt(limit),
    raw:   false,
  });
};

// ─── 6. Inventory Report ──────────────────────────────────────────────────────
const getInventoryReport = async ({ store_id }) => {
  const where = store_id ? { store_id } : {};
  return ProductInventory.findAll({
    where,
    include: [
      { model: Product, where: { is_active: 1 }, attributes: ["id", "name", "sku", "alert_quantity", "selling_price", "purchase_price"],
        include: [{ model: Unit, as: "UnitRef", attributes: ["name"] }] },
      { model: Store,   attributes: ["id", "name", "code"] },
    ],
    order: [[Product, "name", "ASC"]],
  });
};

// ─── 7. Low Stock Report ──────────────────────────────────────────────────────
const getLowStockReport = async ({ store_id }) => {
  const where = store_id ? { store_id } : {};
  const items = await ProductInventory.findAll({
    where,
    include: [
      { model: Product, where: { is_active: 1 }, attributes: ["id", "name", "sku", "alert_quantity"],
        include: [{ model: Unit, as: "UnitRef", attributes: ["name"] }] },
      { model: Store,   attributes: ["id", "name", "code"] },
    ],
  });
  return items.filter((i) => i.Product && parseFloat(i.quantity) <= parseFloat(i.Product.alert_quantity));
};

// ─── 8. Returns Report ────────────────────────────────────────────────────────
const getReturnsReport = async ({ store_id, from, to }) => {
  const where = { ...dateFilter(from, to) };
  if (store_id) where.store_id = store_id;

  const [salesReturns, purchaseReturns, vendorReturns] = await Promise.all([
    Return.findAll({ where }),
    PurchaseReturn.findAll({ where: { ...dateFilter(from, to, "return_date"), ...(store_id ? { store_id } : {}) } }),
    VendorReturn.findAll({ where: { ...dateFilter(from, to, "return_date"), ...(store_id ? { store_id } : {}) } }),
  ]);

  const sales_returns_total    = salesReturns.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
  const purchase_returns_total = purchaseReturns.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
  const vendor_returns_total   = vendorReturns.reduce((s, x) => s + parseFloat(x.refund_amount || 0), 0);

  return {
    total_returns:         salesReturns.length + purchaseReturns.length + vendorReturns.length,
    sales_returns_count:   salesReturns.length,
    sales_returns_total,
    purchase_returns_count: purchaseReturns.length,
    purchase_returns_total,
    vendor_returns_count:  vendorReturns.length,
    vendor_returns_total,
    total_refund:          sales_returns_total + purchase_returns_total + vendor_returns_total,
    sales_returns:         salesReturns,
    purchase_returns:      purchaseReturns,
    vendor_returns:        vendorReturns,
  };
};

// ─── 9. Vendor Purchase Report ────────────────────────────────────────────────
const getVendorReport = async ({ store_id, from, to }) => {
  const where = { status: "received", ...dateFilter(from, to, "purchase_date") };
  if (store_id) where.store_id = store_id;

  return Purchase.findAll({
    attributes: [
      "vendor_id",
      [fn("COUNT", col("Purchase.id")), "total_purchases"],
      [fn("SUM", col("total_amount")), "total_amount"],
      [fn("SUM", col("paid_amount")),  "total_paid"],
      [fn("SUM", col("due_amount")),   "total_due"],
    ],
    where,
    include: [{ model: Vendor, attributes: ["id", "name", "company"], required: true }],
    group: ["vendor_id"],
    order: [[literal("total_amount"), "DESC"]],
    raw:   false,
  });
};

// ─── 10. Daily Summary ────────────────────────────────────────────────────────
const getDailySummary = async ({ store_id, date }) => {
  const day  = date ? new Date(date) : new Date();
  const from = new Date(day.setHours(0, 0, 0, 0));
  const to   = new Date(day.setHours(23, 59, 59, 999));

  const saleWhere = { status: "completed", sale_date:     { [Op.between]: [from, to] } };
  const purWhere  = { status: "received",   purchase_date: { [Op.between]: [from, to] } };
  const retWhere  = {                       created_at:    { [Op.between]: [from, to] } };

  if (store_id) {
    saleWhere.store_id = store_id;
    purWhere.store_id  = store_id;
    retWhere.store_id  = store_id;
  }

  const [sales, purchases, returns] = await Promise.all([
    Sale.findAll({ where: saleWhere }),
    Purchase.findAll({ where: purWhere }),
    Return.findAll({ where: retWhere }),
  ]);

  return {
    date: from.toISOString().split("T")[0],
    sales:     { count: sales.length,     revenue: sales.reduce((s, x)     => s + parseFloat(x.total_amount), 0), tax: sales.reduce((s, x) => s + parseFloat(x.tax_amount), 0), cost: sales.reduce((s, x) => s + parseFloat(x.total_cost || 0), 0), profit: parseFloat((sales.reduce((s, x) => s + parseFloat(x.total_amount), 0) - sales.reduce((s, x) => s + parseFloat(x.tax_amount), 0) - sales.reduce((s, x) => s + parseFloat(x.total_cost || 0), 0)).toFixed(2)) },
    purchases: { count: purchases.length, cost:    purchases.reduce((s, x) => s + parseFloat(x.total_amount), 0) },
    returns:   { count: returns.length,   refund:  returns.reduce((s, x)   => s + parseFloat(x.total_amount), 0) },
  };
};

// ─── 11. Trial Balance ────────────────────────────────────────────────────────
const getTrialBalance = async ({ store_id }) => {
  const sid = parseInt(store_id);
  // If no store context, return empty balanced result rather than crashing
  if (!sid || isNaN(sid)) {
    return { rows: [], total_debit: 0, total_credit: 0, balanced: true, warning: "No store context. Please ensure you are assigned to a store." };
  }

  const accounts = await LedgerAccount.findAll({
    where:   { store_id: sid, is_active: 1 },
    include: [{ model: AccountCategory, as: "category", attributes: ["name", "group"] }],
    order:   [["name", "ASC"]],
  });

  // Aggregate JE lines per account in one query
  const jeSums = await JournalEntryLine.findAll({
    attributes: [
      "ledger_account_id",
      [fn("SUM", col("debit")),  "total_debit"],
      [fn("SUM", col("credit")), "total_credit"],
    ],
    where:   { ledger_account_id: accounts.map((a) => a.id) },
    group:   ["ledger_account_id"],
    raw:     true,
  });

  const sumMap = {};
  jeSums.forEach((s) => {
    sumMap[s.ledger_account_id] = {
      total_debit:  parseFloat(s.total_debit  || 0),
      total_credit: parseFloat(s.total_credit || 0),
    };
  });

  const rows = accounts
    .map((acc) => {
      const sums        = sumMap[acc.id] || { total_debit: 0, total_credit: 0 };
      const totalDebit  = sums.total_debit;
      const totalCredit = sums.total_credit;
      const balance     = totalDebit - totalCredit;

      return {
        account_id:      acc.id,
        name:            acc.name,
        category:        acc.category?.name,
        group:           acc.category?.group,
        opening_balance: Math.round(parseFloat(acc.opening_balance || 0) * 100) / 100,
        total_debit:     Math.round(totalDebit * 100) / 100,
        total_credit:    Math.round(totalCredit * 100) / 100,
        debit_balance:  Math.round(Math.max(0,  balance) * 100) / 100,
        credit_balance: Math.round(Math.max(0, -balance) * 100) / 100,
      };
    })
    .filter((r) => r.total_debit > 0 || r.total_credit > 0 || r.opening_balance !== 0);

  const totalDebitBal  = rows.reduce((s, r) => s + r.debit_balance,  0);
  const totalCreditBal = rows.reduce((s, r) => s + r.credit_balance, 0);

  return {
    rows,
    total_debit:  Math.round(totalDebitBal  * 100) / 100,
    total_credit: Math.round(totalCreditBal * 100) / 100,
    balanced:     Math.abs(totalDebitBal - totalCreditBal) < 0.01,
  };
};

// ─── 12. Balance Sheet ────────────────────────────────────────────────────────
const getBalanceSheet = async ({ store_id }) => {
  const sid = parseInt(store_id);
  if (!sid || isNaN(sid)) {
    return {
      assets:      { items: [], total: 0 },
      liabilities: { items: [], total: 0 },
      equity:      { items: [], total: 0 },
      total_liabilities_equity: 0,
      balanced: true,
      warning: "No store context. Please ensure you are assigned to a store.",
    };
  }

  const accounts = await LedgerAccount.findAll({
    where:   { store_id: sid, is_active: 1 },
    include: [{ model: AccountCategory, as: "category", attributes: ["name", "group"] }],
  });

  const jeSums = await JournalEntryLine.findAll({
    attributes: [
      "ledger_account_id",
      [fn("SUM", col("debit")),  "total_debit"],
      [fn("SUM", col("credit")), "total_credit"],
    ],
    where: { ledger_account_id: accounts.map((a) => a.id) },
    group: ["ledger_account_id"],
    raw:   true,
  });

  const sumMap = {};
  jeSums.forEach((s) => {
    sumMap[s.ledger_account_id] = {
      total_debit:  parseFloat(s.total_debit  || 0),
      total_credit: parseFloat(s.total_credit || 0),
    };
  });

  const assets      = [];
  const liabilities = [];
  const equity      = [];

  let netProfit = 0;

  for (const acc of accounts) {
    const sums = sumMap[acc.id] || { total_debit: 0, total_credit: 0 };
    const raw  = sums.total_debit - sums.total_credit;
    const group   = acc.category?.group;
    if (!group) continue;

    if (group === "Income" || group === "Expenditure") {
      netProfit -= raw;
      continue;
    }

    const balance = Math.round((group === "Asset" ? raw : -raw) * 100) / 100;
    const row     = { name: acc.name, category: acc.category?.name, balance };
    if (group === "Asset")         assets.push(row);
    else if (group === "Liability") liabilities.push(row);
    else if (group === "Equity")    equity.push(row);
  }

  const round = (v) => Math.round(v * 100) / 100;
  netProfit = round(netProfit);

  if (netProfit !== 0) {
    equity.push({
      name:     netProfit > 0 ? "Retained Earnings (Profit)" : "Retained Earnings (Loss)",
      category: "Retained Earnings",
      balance:  netProfit,
    });
  }

  const totalAssets = round(assets.reduce((s, r)      => s + r.balance, 0));
  const totalLiab   = round(liabilities.reduce((s, r) => s + r.balance, 0));
  const totalEquity = round(equity.reduce((s, r)       => s + r.balance, 0));

  return {
    assets:      { items: assets,      total: totalAssets },
    liabilities: { items: liabilities, total: totalLiab   },
    equity:      { items: equity,      total: totalEquity  },
    total_liabilities_equity: round(totalLiab + totalEquity),
    balanced: Math.abs(totalAssets - (totalLiab + totalEquity)) < 0.01,
  };
};

// ─── 13. AR Aging (Accounts Receivable) ──────────────────────────────────────
const getARaging = async ({ store_id }) => {
  const where = { due_amount: { [Op.gt]: 0 }, status: "completed" };
  if (store_id) where.store_id = parseInt(store_id);

  const sales = await Sale.findAll({
    where,
    include: [{ model: Customer, attributes: ["id", "name", "phone"], required: false }],
    order:   [["sale_date", "DESC"]],
  });

  const today = new Date();
  const buckets = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };

  const rows = sales.map((s) => {
    const daysOverdue = Math.floor((today - new Date(s.sale_date)) / 86400000);
    const due = parseFloat(s.due_amount);
    let bucket;
    if      (daysOverdue <= 0)  { bucket = "current";    buckets.current    += due; }
    else if (daysOverdue <= 30) { bucket = "1-30 days";  buckets.days_1_30  += due; }
    else if (daysOverdue <= 60) { bucket = "31-60 days"; buckets.days_31_60 += due; }
    else if (daysOverdue <= 90) { bucket = "61-90 days"; buckets.days_61_90 += due; }
    else                        { bucket = "90+ days";   buckets.over_90    += due; }

    return {
      sale_id:        s.id,
      invoice_number: s.invoice_number,
      customer:       s.Customer ? { id: s.Customer.id, name: s.Customer.name, phone: s.Customer.phone } : null,
      sale_date:      s.sale_date,
      due_amount:     due,
      days_overdue:   daysOverdue,
      bucket,
    };
  });

  const round     = (v) => Math.round(v * 100) / 100;
  const total_due = round(Object.values(buckets).reduce((a, b) => a + b, 0));
  Object.keys(buckets).forEach((k) => { buckets[k] = round(buckets[k]); });

  return { summary: buckets, total_due, rows };
};

// ─── 14. AP Aging (Accounts Payable) ─────────────────────────────────────────
const getAPaging = async ({ store_id }) => {
  const where = { due_amount: { [Op.gt]: 0 }, status: "received" };
  if (store_id) where.store_id = parseInt(store_id);

  const purchases = await Purchase.findAll({
    where,
    include: [{ model: Vendor, attributes: ["id", "name", "company"], required: false }],
    order:   [["purchase_date", "DESC"]],
  });

  const today = new Date();
  const buckets = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };

  const rows = purchases.map((p) => {
    const daysOverdue = Math.floor((today - new Date(p.purchase_date)) / 86400000);
    const due = parseFloat(p.due_amount);
    let bucket;
    if      (daysOverdue <= 0)  { bucket = "current";    buckets.current    += due; }
    else if (daysOverdue <= 30) { bucket = "1-30 days";  buckets.days_1_30  += due; }
    else if (daysOverdue <= 60) { bucket = "31-60 days"; buckets.days_31_60 += due; }
    else if (daysOverdue <= 90) { bucket = "61-90 days"; buckets.days_61_90 += due; }
    else                        { bucket = "90+ days";   buckets.over_90    += due; }

    return {
      purchase_id:     p.id,
      purchase_number: p.purchase_number,
      vendor:          p.Vendor ? { id: p.Vendor.id, name: p.Vendor.name, company: p.Vendor.company } : null,
      purchase_date:   p.purchase_date,
      due_amount:      due,
      days_overdue:    daysOverdue,
      bucket,
    };
  });

  const round     = (v) => Math.round(v * 100) / 100;
  const total_due = round(Object.values(buckets).reduce((a, b) => a + b, 0));
  Object.keys(buckets).forEach((k) => { buckets[k] = round(buckets[k]); });

  return { summary: buckets, total_due, rows };
};

// ─── GST Summary ──────────────────────────────────────────────────────────────
const getGstSummary = async ({ store_id, from, to }) => {
  const saleWhere = { status: "completed", ...dateFilter(from, to, "sale_date") };
  if (store_id) saleWhere.store_id = store_id;

  const purchWhere = { status: "received", ...dateFilter(from, to, "purchase_date") };
  if (store_id) purchWhere.store_id = store_id;

  const [sales, purchases] = await Promise.all([
    Sale.findAll({ where: saleWhere, attributes: ["tax_amount", "total_amount", "subtotal"] }),
    Purchase.findAll({ where: purchWhere, attributes: ["tax_amount", "total_amount", "subtotal"] }),
  ]);

  const gst_collected  = sales.reduce((s, x) => s + parseFloat(x.tax_amount || 0), 0);
  const gst_input      = purchases.reduce((s, x) => s + parseFloat(x.tax_amount || 0), 0);
  const net_gst = gst_collected - gst_input;

  return {
    period: { from: from || null, to: to || null },
    gst_collected:    parseFloat(gst_collected.toFixed(2)),
    gst_input_credit: parseFloat(gst_input.toFixed(2)),
    net_gst_payable:  parseFloat(Math.max(0, net_gst).toFixed(2)),
    refundable_gst:   parseFloat(Math.max(0, -net_gst).toFixed(2)),
    total_sales:       sales.length,
    total_purchases:   purchases.length,
  };
};

module.exports = {
  getSalesSummary,
  getPurchaseSummary,
  getProfitLoss,
  getTopProducts,
  getTopCustomers,
  getInventoryReport,
  getLowStockReport,
  getReturnsReport,
  getVendorReport,
  getDailySummary,
  getTrialBalance,
  getBalanceSheet,
  getARaging,
  getAPaging,
  getGstSummary,
};
