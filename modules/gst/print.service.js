"use strict";

const PDFDocument = require("pdfkit");
const { getSaleGST } = require("./gst.service");
const AppError = require("../../utils/AppError");

// ─── Number to Words ──────────────────────────────────────────────────────────
const numberToWords = (num) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
};

// ─── Generate A4 Tax Invoice PDF ──────────────────────────────────────────────
const generateInvoicePDF = async (sale_id, storeId, res) => {
  const { sale, items, gst_summary, is_interstate } = await getSaleGST(sale_id, storeId);

  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="invoice-${sale.invoice_number}.pdf"`,
  );
  doc.pipe(res);

  const W = 515;
  const store = sale.Store;
  if (!store) throw new AppError("Store information not found for this sale", 404);
  if (!store.gstin) throw new AppError("Store GSTIN is not configured. Cannot generate tax invoice.", 422);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(13).text(store.name || "MySkin Store", { align: "center" });
  doc
    .fontSize(9)
    .font("Helvetica")
    .text(store.address || "", { align: "center" })
    .text(`Phone: ${store.phone || ""}  Email: ${store.email || ""}`, {
      align: "center",
    })
    .text(`GSTIN: ${store.gstin}`, { align: "center" });

  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Invoice Info + Customer ──────────────────────────────────────────────────
  const infoY = doc.y;
  doc.fontSize(9).font("Helvetica-Bold").text("Invoice Details:", 40, infoY);
  doc
    .font("Helvetica")
    .text(`Invoice No : ${sale.invoice_number}`, 40)
    .text(
      `Date       : ${new Date(sale.sale_date).toLocaleDateString("en-IN")}`,
      40,
    )
    .text(`Cashier    : ${sale.User?.name || ""}`, 40)
    .text(`Status     : ${sale.status.toUpperCase()}`, 40);

  const customer = sale.Customer;
  doc.fontSize(9).font("Helvetica-Bold").text("Bill To:", 320, infoY);
  doc
    .font("Helvetica")
    .text(customer?.name || "Walk-in Customer", 320)
    .text(customer?.phone || "", 320)
    .text(customer?.address || "", 320);

  doc.moveDown(1.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // ── Items Table Header ────────────────────────────────────────────────────────
  const col = {
    no: 40,
    name: 60,
    qty: 250,
    rate: 290,
    disc: 340,
    taxable: 385,
    gst: 435,
    total: 475,
  };
  doc.fontSize(8).font("Helvetica-Bold");
  doc.text("#", col.no, doc.y, { width: 20 });
  doc.text("Item", col.name, doc.y - 10, { width: 185 });
  doc.text("Qty", col.qty, doc.y - 10, { width: 40, align: "right" });
  doc.text("Rate", col.rate, doc.y - 10, { width: 45, align: "right" });
  doc.text("Disc", col.disc, doc.y - 10, { width: 40, align: "right" });
  doc.text("Taxable", col.taxable, doc.y - 10, { width: 48, align: "right" });
  doc.text("GST", col.gst, doc.y - 10, { width: 38, align: "right" });
  doc.text("Total", col.total, doc.y - 10, { width: 45, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // ── Items ─────────────────────────────────────────────────────────────────────
  doc.font("Helvetica").fontSize(8);
  items.forEach((item, i) => {
    const y = doc.y;
    doc.text(`${i + 1}`, col.no, y, { width: 20 });
    doc.text(item.product_name, col.name, y, { width: 185 });
    doc.text(`${parseFloat(item.quantity)}`, col.qty, y, {
      width: 40,
      align: "right",
    });
    doc.text(`₹${parseFloat(item.unit_price).toFixed(2)}`, col.rate, y, {
      width: 45,
      align: "right",
    });
    doc.text(`₹${parseFloat(item.discount_amount).toFixed(2)}`, col.disc, y, {
      width: 40,
      align: "right",
    });
    doc.text(`₹${item.taxable_amount.toFixed(2)}`, col.taxable, y, {
      width: 48,
      align: "right",
    });
    doc.text(`${item.tax_rate}%`, col.gst, y, { width: 38, align: "right" });
    doc.text(`₹${parseFloat(item.total_price).toFixed(2)}`, col.total, y, {
      width: 45,
      align: "right",
    });
    doc.moveDown(0.6);
  });

  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // ── GST Summary ───────────────────────────────────────────────────────────────
  const sumX = 340;
  doc.fontSize(8).font("Helvetica");
  const row = (label, value) => {
    doc.text(label, sumX, doc.y, { width: 130 });
    doc.text(`₹${value.toFixed(2)}`, sumX + 130, doc.y - 10, {
      width: 80,
      align: "right",
    });
    doc.moveDown(0.4);
  };

  row("Subtotal", parseFloat(sale.subtotal));
  row("Discount", parseFloat(sale.discount_amount));
  row("Taxable Amount", gst_summary.taxable_amount);

  if (!is_interstate) {
    row("CGST", gst_summary.cgst);
    row("SGST", gst_summary.sgst);
  } else {
    row("IGST", gst_summary.igst);
  }

  if (parseFloat(sale.shipping_charge) > 0) {
    row("Shipping", parseFloat(sale.shipping_charge));
  }
  if (parseFloat(sale.round_off) !== 0) {
    row("Round Off", parseFloat(sale.round_off));
  }

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Grand Total", sumX, doc.y, { width: 130 });
  doc.text(
    `₹${parseFloat(sale.total_amount).toFixed(2)}`,
    sumX + 130,
    doc.y - 12,
    { width: 80, align: "right" },
  );
  doc.moveDown(0.5);

  // ── Amount in Words ───────────────────────────────────────────────────────────
  doc.font("Helvetica").fontSize(8);
  doc.text(
    `Amount in Words: ${numberToWords(parseFloat(sale.total_amount))}`,
    40,
    doc.y,
  );
  doc.moveDown(0.5);

  // ── Payment Details ───────────────────────────────────────────────────────────
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(8).text("Payment Details:", 40);
  doc.font("Helvetica");

  const payments = sale.payments || [];
  payments.forEach((p) => {
    doc.text(
      `${p.payment_method.toUpperCase()}: ₹${parseFloat(p.amount).toFixed(2)}`,
      40,
    );
  });

  doc.text(`Paid Amount : ₹${parseFloat(sale.paid_amount).toFixed(2)}`, 40);
  doc.text(`Due Amount  : ₹${parseFloat(sale.due_amount).toFixed(2)}`, 40);
  doc.moveDown(0.5);

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);
  doc
    .fontSize(8)
    .font("Helvetica")
    .text("Thank you for your business!", { align: "center" });
  doc.text("This is a computer generated invoice.", { align: "center" });
  doc.moveDown(0.3);
  doc
    .fontSize(7)
    .text(
      "Terms: Goods once sold will not be taken back. Subject to local jurisdiction.",
      { align: "center" },
    );

  doc.end();
};

// ─── Generate 80mm Thermal Receipt ───────────────────────────────────────────
const generateReceiptPDF = async (sale_id, storeId, res) => {
  const { sale, items, gst_summary, is_interstate } = await getSaleGST(sale_id, storeId);

  const doc = new PDFDocument({ margin: 10, size: [226, 800] });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receipt-${sale.invoice_number}.pdf"`,
  );
  doc.pipe(res);

  const store = sale.Store;
  if (!store) throw new AppError("Store information not found for this sale", 404);

  const W = 206; // usable width

  // ── Store Header ──────────────────────────────────────────────────────────────
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(store.name || "MySkin Store", { align: "center" });
  doc
    .fontSize(7)
    .font("Helvetica")
    .text(store.address || "", { align: "center" })
    .text(store.phone || "", { align: "center" });
  if (store.gstin) {
    doc.text(`GSTIN: ${store.gstin}`, { align: "center" });
  }

  doc.moveDown(0.3);
  doc
    .moveTo(10, doc.y)
    .lineTo(216, doc.y)
    .dash(2, { space: 2 })
    .stroke()
    .undash();
  doc.moveDown(0.3);

  // ── Invoice Info ──────────────────────────────────────────────────────────────
  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", { align: "center" });
  doc
    .font("Helvetica")
    .text(`Invoice: ${sale.invoice_number}`)
    .text(`Date   : ${new Date(sale.sale_date).toLocaleDateString("en-IN")}`)
    .text(`Customer: ${sale.Customer?.name || "Walk-in"}`);

  doc.moveDown(0.3);
  doc
    .moveTo(10, doc.y)
    .lineTo(216, doc.y)
    .dash(2, { space: 2 })
    .stroke()
    .undash();
  doc.moveDown(0.3);

  // ── Items ─────────────────────────────────────────────────────────────────────
  doc.fontSize(7).font("Helvetica-Bold");
  doc.text("Item", 10, doc.y, { width: 100 });
  doc.text("Qty", 110, doc.y - 8, { width: 30, align: "right" });
  doc.text("Rate", 145, doc.y - 8, { width: 30, align: "right" });
  doc.text("Total", 178, doc.y - 8, { width: 38, align: "right" });
  doc.moveDown(0.2);
  doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
  doc.moveDown(0.2);

  doc.font("Helvetica").fontSize(7);
  items.forEach((item) => {
    const y = doc.y;
    doc.text(item.product_name, 10, y, { width: 100 });
    doc.text(`${parseFloat(item.quantity)}`, 110, y, {
      width: 30,
      align: "right",
    });
    doc.text(`${parseFloat(item.unit_price).toFixed(2)}`, 145, y, {
      width: 30,
      align: "right",
    });
    doc.text(`${parseFloat(item.total_price).toFixed(2)}`, 178, y, {
      width: 38,
      align: "right",
    });
    doc.moveDown(0.5);
  });

  doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
  doc.moveDown(0.3);

  // ── Totals ────────────────────────────────────────────────────────────────────
  const tRow = (label, value, bold = false) => {
    if (bold) doc.font("Helvetica-Bold");
    else doc.font("Helvetica");
    doc.fontSize(7).text(label, 10, doc.y, { width: 130 });
    doc.text(`₹${parseFloat(value).toFixed(2)}`, 140, doc.y - 8, {
      width: 76,
      align: "right",
    });
    doc.moveDown(0.4);
  };

  tRow("Subtotal", sale.subtotal);
  tRow("Discount", sale.discount_amount);
  tRow("Taxable", gst_summary.taxable_amount);
  if (!is_interstate) {
    tRow(`CGST`, gst_summary.cgst);
    tRow(`SGST`, gst_summary.sgst);
  } else {
    tRow(`IGST`, gst_summary.igst);
  }
  tRow("Round Off", sale.round_off);
  tRow("GRAND TOTAL", sale.total_amount, true);
  tRow("Paid", sale.paid_amount);
  tRow("Balance Due", sale.due_amount);

  doc.moveDown(0.3);
  doc
    .moveTo(10, doc.y)
    .lineTo(216, doc.y)
    .dash(2, { space: 2 })
    .stroke()
    .undash();
  doc.moveDown(0.3);

  // ── Payment ───────────────────────────────────────────────────────────────────
  doc.fontSize(7).font("Helvetica-Bold").text("Payment:");
  doc.font("Helvetica");
  (sale.payments || []).forEach((p) => {
    doc.text(
      `${p.payment_method.toUpperCase()}: ₹${parseFloat(p.amount).toFixed(2)}`,
    );
  });

  doc.moveDown(0.3);
  doc
    .moveTo(10, doc.y)
    .lineTo(216, doc.y)
    .dash(2, { space: 2 })
    .stroke()
    .undash();
  doc.moveDown(0.3);

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc
    .fontSize(7)
    .font("Helvetica")
    .text("Thank you for shopping with us!", { align: "center" })
    .text("Visit Again!", { align: "center" })
    .text("This is a computer generated receipt.", { align: "center" });

  doc.end();
};

module.exports = { generateInvoicePDF, generateReceiptPDF };
