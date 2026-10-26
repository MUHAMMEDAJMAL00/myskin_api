"use strict";

const { Op, fn, col, literal } = require("sequelize");
const {
  Sale,
  SaleItem,
  Purchase,
  Product,
  ProductInventory,
  Customer,
  Vendor,
  CashRegister,
  User,
  Unit,
} = require("../../database/index");

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { [Op.between]: [start, end] };
};

const getWeeklyStats = async (store_id) => {
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 6);
  const fStart = new Date(fromDate);
  fStart.setHours(0, 0, 0, 0);
  const tEnd = new Date(now);
  tEnd.setHours(23, 59, 59, 999);

  const saleWhere = { status: "completed", sale_date: { [Op.between]: [fStart, tEnd] } };
  if (store_id != null) saleWhere.store_id = store_id;
  const purchWhere = { status: "received", purchase_date: { [Op.between]: [fStart, tEnd] } };
  if (store_id != null) purchWhere.store_id = store_id;

  const [saleRows, purchRows] = await Promise.all([
    Sale.findAll({
      where: saleWhere,
      attributes: [
        [fn("DATE", col("sale_date")), "day"],
        [fn("SUM", col("total_amount")), "total"],
        [fn("SUM", col("tax_amount")), "tax"],
        [fn("SUM", col("total_cost")), "cost"],
      ],
      group: [fn("DATE", col("sale_date"))],
      raw: true,
    }),
    Purchase.findAll({
      where: purchWhere,
      attributes: [
        [fn("DATE", col("purchase_date")), "day"],
        [fn("SUM", col("total_amount")), "total"],
      ],
      group: [fn("DATE", col("purchase_date"))],
      raw: true,
    }),
  ]);

  const saleMap = {};
  saleRows.forEach(r => {
    saleMap[r.day] = {
      total: parseFloat(r.total || 0),
      tax: parseFloat(r.tax || 0),
      cost: parseFloat(r.cost || 0),
    };
  });
  const purchMap = {};
  purchRows.forEach(r => { purchMap[r.day] = parseFloat(r.total || 0); });

  const stats = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const saleData = saleMap[key] || { total: 0, tax: 0, cost: 0 };
    stats.push({
      date: key,
      income: saleData.total,
      expense: purchMap[key] || 0,
      profit: parseFloat((saleData.total - saleData.tax - saleData.cost).toFixed(2)),
    });
  }
  return stats;
};

exports.getSummary = async (store_id) => {
  const sid = parseInt(store_id);
  if (!store_id || isNaN(sid)) throw Object.assign(new Error("store_id is required"), { status: 400 });

  const todayWhereSale = { status: "completed", created_at: todayRange(), store_id: sid };

  const todayWherePurch = { status: "received", created_at: todayRange(), store_id: sid };

  const invWhere = { store_id: sid };

  const registerWhere = { status: "open", store_id: sid };

  const [
    todaySales,
    todayPurchases,
    stockValue,
    lowStockItems,
    totalCustomers,
    vendorDues,
    cashRegister,
    weeklyStats,
    recentSales,
    topProducts
  ] = await Promise.all([
    Sale.findOne({
      where: todayWhereSale,
      attributes: [
        [fn("COUNT", col("id")), "count"],
        [fn("SUM", col("total_amount")), "total"],
        [fn("SUM", col("tax_amount")), "tax"],
        [fn("SUM", col("total_cost")), "cost"],
      ],
      raw: true,
    }),
    Purchase.findOne({
      where: todayWherePurch,
      attributes: [
        [fn("COUNT", col("id")), "count"],
        [fn("SUM", col("total_amount")), "total"],
      ],
      raw: true,
    }),
    ProductInventory.findAll({
      where: invWhere,
      include: [{ model: Product, attributes: ["purchase_price"], where: { is_active: 1 } }],
      attributes: ["quantity"],
      raw: true,
    }),
    ProductInventory.findAll({
      where: invWhere,
      include: [{ model: Product, attributes: ["alert_quantity"], where: { is_active: 1, is_service: 0 } }],
      raw: true,
    }),
    Customer.count({ where: { store_id: sid, is_active: 1 } }),
    Vendor.findOne({
      where: { store_id: sid, is_active: 1 },
      attributes: [[fn("SUM", col("balance")), "total_due"]],
      raw: true,
    }),
    CashRegister.findOne({
      where: registerWhere,
      order: [["created_at", "DESC"]],
    }),
    getWeeklyStats(store_id),
    exports.getRecentSales(store_id),
    exports.getTopProducts(store_id, 7)
  ]);

  const totalStockValue = stockValue.reduce((sum, row) => {
    return sum + (parseFloat(row.quantity || 0) * parseFloat(row["Product.purchase_price"] || 0));
  }, 0);

  const lowStockCount = lowStockItems.filter(
    (row) => parseFloat(row.quantity) <= parseFloat(row["Product.alert_quantity"])
  ).length;

  return {
    today: {
      sales_count: parseInt(todaySales?.count || 0),
      sales_total: parseFloat(todaySales?.total || 0),
      cost: parseFloat(todaySales?.cost || 0),
      profit: parseFloat(
        ((todaySales?.total || 0) - (todaySales?.tax || 0) - (todaySales?.cost || 0)).toFixed(2)
      ),
      purchases_count: parseInt(todayPurchases?.count || 0),
      purchases_total: parseFloat(todayPurchases?.total || 0),
    },
    inventory: {
      total_stock_value: parseFloat(totalStockValue.toFixed(2)),
      low_stock_products: lowStockCount,
    },
    customers: {
      total: totalCustomers,
    },
    vendors: {
      total_dues: parseFloat(vendorDues?.total_due || 0),
    },
    cash_register: cashRegister
      ? { status: "open", opened_at: cashRegister.opened_at, opening_balance: cashRegister.opening_balance }
      : { status: "closed" },
    weekly_stats: weeklyStats,
    recent_sales: recentSales,
    top_products: topProducts
  };
};

exports.getLowStock = async (store_id) => {
  const invWhere = {};
  if (store_id != null) invWhere.store_id = store_id;

  const items = await ProductInventory.findAll({
    where: invWhere,
    include: [
      {
        model: Product,
        attributes: ["id", "name", "sku", "alert_quantity"],
        where: { is_active: 1, is_service: 0 },
        include: [{ model: Unit, as: "UnitRef", attributes: ["name"] }],
      },
    ],
    raw: true,
  });

  return items
    .filter(
      (row) =>
        parseFloat(row.quantity) <= parseFloat(row["Product.alert_quantity"]),
    )
    .map((row) => ({
      product_id: row["Product.id"],
      name: row["Product.name"],
      sku: row["Product.sku"],
      unit: row["Product.UnitRef.name"] || null,
      current_stock: parseFloat(row.quantity),
      alert_quantity: parseFloat(row["Product.alert_quantity"]),
    }));
};

exports.getTopProducts = async (store_id, days) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const saleWhere = { status: "completed", created_at: { [Op.gte]: since } };
  if (store_id != null) saleWhere.store_id = store_id;

  const results = await SaleItem.findAll({
    include: [
      {
        model: Sale,
        attributes: [],
        where: saleWhere,
      },
    ],
    attributes: [
      "product_id",
      "product_name",
      [fn("SUM", col("quantity")), "total_qty"],
      [fn("SUM", col("total_price")), "total_revenue"],
    ],
    group: ["product_id", "product_name"],
    order: [[literal("total_qty"), "DESC"]],
    limit: 10,
    raw: true,
  });

  return results.map((r) => ({
    product_id: r.product_id,
    name: r.product_name,
    total_qty: parseFloat(r.total_qty),
    total_revenue: parseFloat(r.total_revenue),
  }));
};

exports.getRecentSales = async (store_id) => {
  const where = { status: "completed" };
  if (store_id != null) where.store_id = store_id;

  const sales = await Sale.findAll({
    where,
    include: [
      { model: Customer, attributes: ["name", "phone"] },
      { model: SaleItem, as: "items", attributes: ["id"] },
    ],
    order: [["created_at", "DESC"]],
    limit: 10,
    attributes: [
      "id",
      "invoice_number",
      "total_amount",
      "paid_amount",
      "due_amount",
      "tax_amount",
      "total_cost",
      "created_at",
      "status",
    ],
  });
  return sales.map(s => {
    const item = s.toJSON();
    const revenue = parseFloat(item.total_amount || 0) - parseFloat(item.tax_amount || 0);
    const cost = parseFloat(item.total_cost || 0);
    item.total_profit = parseFloat((revenue - cost).toFixed(2));
    return item;
  });
};
