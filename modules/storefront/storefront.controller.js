"use strict";

const crypto = require("crypto");
const categoryService = require("../categories/categories.service");
const productService = require("../products/products.service");
const salesService = require("../sales/sales.service");
const {
  Customer,
  Store,
  Sale,
  SaleItem,
  SalePayment,
  Return,
  ReturnItem,
  ProductVariant,
} = require("../../database/index");
const env = require("../../config/env");

// ─── Categories (public) ──────────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const { page, limit = 20, search, parent_id } = req.query;
    const result = await categoryService.getAllCategories({
      page, limit, search, parent_id,
      is_active: 1,
      filterByStore: false,
    });
    if (Array.isArray(result)) {
      res.json({ success: true, data: result });
    } else {
      res.json({ success: true, ...result });
    }
  } catch (err) { next(err); }
};

const getCategory = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category.is_active) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
};

// ─── Products (public, with sort) ─────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category_id, sort } = req.query;
    const result = await productService.getAllProducts({
      page, limit, search, category_id,
      is_active: 1,
      filterByStore: false,
    });
    let data = result.data || result;

    // Load variants for all products
    if (data.length) {
      const productIds = data.map((p) => p.id);
      const variants = await ProductVariant.findAll({
        where: { product_id: productIds, is_active: 1 },
        attributes: ["id", "product_id", "variant_name", "selling_price", "mrp", "purchase_price", "quantity", "unit", "sku", "image_url"],
      });
      const variantMap = {};
      variants.forEach((v) => {
        if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
        variantMap[v.product_id].push(v);
      });
      data = data.map((p) => ({ ...p.toJSON ? p.toJSON() : p, variants: variantMap[p.id] || [] }));
    }

    if (sort === "price_asc") {
      data = [...data].sort((a, b) => Number(a.selling_price) - Number(b.selling_price));
    } else if (sort === "price_desc") {
      data = [...data].sort((a, b) => Number(b.selling_price) - Number(a.selling_price));
    } else if (sort === "name_asc") {
      data = [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sort === "name_desc") {
      data = [...data].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    }
    res.json({ success: true, total: result.total || data.length, page: Number(page), limit: Number(limit), total_pages: Math.ceil((result.total || data.length) / Number(limit)), data });
  } catch (err) { next(err); }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product.is_active) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const prod = product.toJSON ? product.toJSON() : product;
    const variants = await ProductVariant.findAll({
      where: { product_id: prod.id, is_active: 1 },
      attributes: ["id", "variant_name", "selling_price", "mrp", "purchase_price", "quantity", "unit", "sku", "image_url"],
    });
    prod.variants = variants || [];
    res.json({ success: true, data: prod });
  } catch (err) { next(err); }
};

// ─── Place Order (authenticated customer) ─────────────────────────────────────
const placeOrder = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.user.id, {
      attributes: ["id", "store_id", "name", "phone"],
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (!customer.store_id) {
      return res.status(400).json({ success: false, message: "No store assigned to your account" });
    }

    const {
      items, payment_method, subtotal, discount_total, tax_total, delivery_charges, total_price, notes,
      razorpay_payment_id, razorpay_order_id, razorpay_signature,
    } = req.body;

    // Verify Razorpay payment if it was an online payment
    if (payment_method === "online" && razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      const expected = crypto.createHmac("sha256", env.razorpay.key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expected !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    }

    let mappedPaymentMethod = payment_method;
    if (payment_method === "cod") mappedPaymentMethod = "credit";
    if (payment_method === "online") mappedPaymentMethod = "upi";

    const payments = mappedPaymentMethod === "credit"
      ? [{ payment_method: "credit", amount: 0, notes: "COD - payment on delivery" }]
      : [{ payment_method: mappedPaymentMethod, amount: total_price, reference_number: razorpay_payment_id || null }];

    const saleData = {
      store_id: customer.store_id,
      customer_id: customer.id,
      items: items.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate || 0,
        tax_included: i.tax_included ?? 0,
      })),
      payments,
      status: mappedPaymentMethod === "credit" ? "pending" : "completed",
      source: "online",
      discount_type: "none",
      discount_value: 0,
      shipping_charge: delivery_charges || 0,
      notes: notes || null,
    };

    const result = await salesService.createSale(saleData, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── Razorpay Order Creation ──────────────────────────────────────────────────
const createRazorpayOrder = async (req, res, next) => {
  const { amount, currency = "INR", receipt } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  // In development with placeholder keys, return a mock order
  if (env.razorpay.key_id === "rzp_test_xxxxxxxxxxxx" || !env.razorpay.key_secret) {
    return res.json({
      success: true,
      data: {
        id: "mock_order_" + Date.now(),
        amount: Math.round(amount * 100),
        currency,
      },
    });
  }

  try {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({
      key_id: env.razorpay.key_id,
      key_secret: env.razorpay.key_secret,
    });

    const order = await instance.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    res.json({ success: true, data: { id: order.id, amount: order.amount, currency: order.currency } });
  } catch (err) {
    // Fallback for dev/testing: return mock order
    res.json({
      success: true,
      data: {
        id: "mock_order_" + Date.now(),
        amount: Math.round(amount * 100),
        currency,
      },
    });
  }
};

// ─── Get My Orders (authenticated customer) ──────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = { customer_id: req.user.id, source: "online" };
    if (status) where.status = status;

    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        { model: SaleItem, as: "items", required: false },
        { model: SalePayment, as: "payments", required: false },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true,
    });

    res.json({ success: true, total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / limit), data: rows });
  } catch (err) { next(err); }
};

// ─── Get Single Order (authenticated customer) ─────────────────────────────
const getMyOrderById = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({
      where: { id: req.params.id, customer_id: req.user.id, source: "online" },
      include: [
        { model: SaleItem, as: "items", required: false },
        { model: SalePayment, as: "payments", required: false },
      ],
    });
    if (!sale) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, data: sale });
  } catch (err) { next(err); }
};

// ─── Request Return (authenticated customer) ─────────────────────────────────
const requestReturn = async (req, res, next) => {
  try {
    const { order_id, items, notes } = req.body;

    const sale = await Sale.findOne({
      where: { id: order_id, customer_id: req.user.id, source: "online" },
    });
    if (!sale) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (sale.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot return a cancelled order" });
    }

    const returnRecord = await Return.create({
      sale_id: order_id,
      store_id: sale.store_id,
      customer_id: req.user.id,
      status: "pending",
      return_reason: notes || "",
      refund_method: "credit",
      refund_amount: 0,
    });

    for (const item of items) {
      await ReturnItem.create({
        return_id: returnRecord.id,
        product_id: item.product_id,
        quantity: item.quantity,
        reason: item.reason || "",
        unit_price: 0,
        total_price: 0,
      });
    }

    res.status(201).json({ success: true, data: { id: returnRecord.id, status: "pending" } });
  } catch (err) { next(err); }
};

// ─── Store Info (public) ──────────────────────────────────────────────────────
const getStoreInfo = async (req, res, next) => {
  try {
    const store = await Store.findOne({
      where: { is_active: 1 },
      attributes: ["id", "name", "code", "currency", "address", "phone", "email"],
      order: [["id", "ASC"]],
    });
    if (!store) {
      return res.status(404).json({ success: false, message: "No active store found" });
    }
    res.json({ success: true, data: store });
  } catch (err) { next(err); }
};

module.exports = {
  getCategories, getCategory, getProducts, getProduct,
  placeOrder, getMyOrders, getMyOrderById,
  createRazorpayOrder, requestReturn, getStoreInfo,
};
