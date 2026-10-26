"use strict";

const {
  Sale,
  SaleItem,
  Store,
  Customer,
  User,
  Purchase,
  PurchaseItem,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const { Op } = require("sequelize");

// ─── Calculate GST from tax_rate ──────────────────────────────────────────────
const calculateGST = (taxable_amount, tax_rate, is_interstate = false) => {
  const total_tax = (taxable_amount * tax_rate) / 100;
  if (is_interstate) {
    return { igst: total_tax, cgst: 0, sgst: 0 };
  }
  return { igst: 0, cgst: total_tax / 2, sgst: total_tax / 2 };
};

// ─── Get Sale with GST breakdown ─────────────────────────────────────────────
const getSaleGST = async (sale_id, store_id = null) => {
  const where = { id: sale_id };
  if (store_id != null) where.store_id = parseInt(store_id, 10);
  const sale = await Sale.findOne({
    where,
    include: [
      { model: SaleItem, as: "items" },
      {
        model: Store,
        attributes: ["id", "name", "code", "address", "phone", "email"],
      },
      {
        model: Customer,
        attributes: ["id", "name", "phone", "address"],
        required: false,
      },
      { model: User, attributes: ["id", "name"] },
    ],
  });
  if (!sale) throw new AppError("Sale not found", 404);

  // Determine if interstate (simplified — extend with customer state later)
  const is_interstate = false;

  let total_cgst = 0;
  let total_sgst = 0;
  let total_igst = 0;
  let total_taxable = 0;

  const items = sale.items.map((item) => {
    const taxable_amount =
      parseFloat(item.total_price) - parseFloat(item.tax_amount || 0);
    const { cgst, sgst, igst } = calculateGST(
      taxable_amount,
      parseFloat(item.tax_rate),
      is_interstate,
    );

    total_taxable += taxable_amount;
    total_cgst += cgst;
    total_sgst += sgst;
    total_igst += igst;

    return {
      ...item.toJSON(),
      taxable_amount,
      cgst,
      sgst,
      igst,
    };
  });

  return {
    sale: sale.toJSON(),
    items,
    gst_summary: {
      taxable_amount: total_taxable,
      cgst: total_cgst,
      sgst: total_sgst,
      igst: total_igst,
      total_tax: total_cgst + total_sgst + total_igst,
    },
    is_interstate,
  };
};

// ─── GSTR-1 Monthly Report ────────────────────────────────────────────────────
const getGSTR1 = async ({ store_id, month, year }) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);

  const where = {
    status: "completed",
    store_id: parseInt(store_id, 10),
    sale_date: { [Op.between]: [from, to] },
  };

  const sales = await Sale.findAll({
    where,
    include: [
      { model: SaleItem, as: "items" },
      { model: Customer, attributes: ["id", "name", "phone"], required: false },
    ],
    order: [["sale_date", "ASC"]],
  });

  let total_taxable = 0;
  let total_cgst = 0;
  let total_sgst = 0;
  let total_igst = 0;
  let total_tax = 0;

  const invoice_list = sales.map((sale) => {
    let sale_taxable = 0;
    let sale_cgst = 0;
    let sale_sgst = 0;
    let sale_igst = 0;

    sale.items.forEach((item) => {
      const taxable =
        parseFloat(item.total_price) - parseFloat(item.tax_amount || 0);
      const { cgst, sgst, igst } = calculateGST(
        taxable,
        parseFloat(item.tax_rate),
        false,
      );
      sale_taxable += taxable;
      sale_cgst += cgst;
      sale_sgst += sgst;
      sale_igst += igst;
    });

    total_taxable += sale_taxable;
    total_cgst += sale_cgst;
    total_sgst += sale_sgst;
    total_igst += sale_igst;
    total_tax += sale_cgst + sale_sgst + sale_igst;

    return {
      invoice_number: sale.invoice_number,
      sale_date: sale.sale_date,
      customer_name: sale.Customer?.name || "Walk-in Customer",
      customer_phone: sale.Customer?.phone || null,
      taxable_amount: sale_taxable,
      cgst: sale_cgst,
      sgst: sale_sgst,
      igst: sale_igst,
      total_tax: sale_cgst + sale_sgst + sale_igst,
      total_amount: parseFloat(sale.total_amount),
    };
  });

  return {
    period: `${String(month).padStart(2, "0")}/${year}`,
    store_id: store_id || null,
    total_invoices: sales.length,
    total_taxable,
    total_cgst,
    total_sgst,
    total_igst,
    total_tax,
    invoices: invoice_list,
  };
};

// ─── Complete GST Summary (Sales + Purchases + Slabs) ───────────────────────
const getGSTSummary = async ({ store_id, from_date, to_date }) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const from = new Date(from_date);
  const to = new Date(to_date);
  to.setHours(23, 59, 59, 999);
  const sid = parseInt(store_id, 10);

  const sales = await Sale.findAll({
    where: {
      status: "completed",
      store_id: sid,
      sale_date: { [Op.between]: [from, to] },
    },
    include: [{ model: SaleItem, as: "items" }],
  });

  const purchases = await Purchase.findAll({
    where: {
      status: "received",
      store_id: sid,
      purchase_date: { [Op.between]: [from, to] },
    },
    include: [{ model: PurchaseItem, as: "items" }],
  });

  const slabs = {
    "0": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "5": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "12": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "18": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "28": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
  };

  const purchase_slabs = {
    "0": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "5": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "12": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "18": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    "28": { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
  };

  const summary = {
    sales: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    purchases: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  };

  // Process Sales (Output Tax)
  sales.forEach(sale => {
    sale.items.forEach(item => {
      const rate = Math.round(parseFloat(item.tax_rate || 0));
      const taxable = parseFloat(item.total_price) - parseFloat(item.tax_amount || 0);
      const { cgst, sgst, igst } = calculateGST(taxable, rate, false); // Assume local for now

      summary.sales.taxable += taxable;
      summary.sales.cgst += cgst;
      summary.sales.sgst += sgst;
      summary.sales.igst += igst;

      if (!slabs[rate]) slabs[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      slabs[rate].taxable += taxable;
      slabs[rate].cgst += cgst;
      slabs[rate].sgst += sgst;
      slabs[rate].igst += igst;
    });
  });

  // Process Purchases (Input Tax Credit)
  purchases.forEach(pur => {
    pur.items.forEach(item => {
      const rate = Math.round(parseFloat(item.tax_rate || 0));
      const taxable = parseFloat(item.total_cost) - parseFloat(item.tax_amount || 0);
      const { cgst, sgst, igst } = calculateGST(taxable, rate, false);

      summary.purchases.taxable += taxable;
      summary.purchases.cgst += cgst;
      summary.purchases.sgst += sgst;
      summary.purchases.igst += igst;

      if (!purchase_slabs[rate]) purchase_slabs[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      purchase_slabs[rate].taxable += taxable;
      purchase_slabs[rate].cgst += cgst;
      purchase_slabs[rate].sgst += sgst;
      purchase_slabs[rate].igst += igst;
    });
  });

  summary.sales.total = summary.sales.cgst + summary.sales.sgst + summary.sales.igst;
  summary.purchases.total = summary.purchases.cgst + summary.purchases.sgst + summary.purchases.igst;

  return {
    period: { from, to },
    summary,
    slabs,
    purchase_slabs,
    net_payable: {
      cgst: summary.sales.cgst - summary.purchases.cgst,
      sgst: summary.sales.sgst - summary.purchases.sgst,
      igst: summary.sales.igst - summary.purchases.igst,
      total: summary.sales.total - summary.purchases.total
    }
  };
};

module.exports = { getSaleGST, getGSTR1, getGSTSummary, calculateGST };
