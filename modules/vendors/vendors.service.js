"use strict";

const { Vendor, Purchase, SupplierPayment, User, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const { Op } = require("sequelize");
const fLedger = require("../shared/financialLedger.service");

// ─── Get All Vendors ──────────────────────────────────────────────────────────
const getAllVendors = async ({ search, is_active, page = 1, limit = 20, storeId } = {}) => {
  const where = {};

  if (storeId) where.store_id = parseInt(storeId, 10);
  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active);
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { company: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Vendor.findAndCountAll({
    where,
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / limit), data: rows };
};

// ─── Get Vendor By ID ─────────────────────────────────────────────────────────
const getVendorById = async (id, storeId) => {
  const where = { id: parseInt(id, 10) };
  if (storeId) where.store_id = parseInt(storeId, 10);
  const vendor = await Vendor.findOne({ where });
  if (!vendor) throw new AppError("Vendor not found", 404);
  return vendor;
};

// ─── Create Vendor ────────────────────────────────────────────────────────────
const createVendor = async (data) => {
  if (data.phone) {
    const existing = await Vendor.findOne({
      where: { phone: data.phone, store_id: data.store_id },
      attributes: ["id"],
    });
    if (existing) throw new AppError("Phone number already registered", 409);
  }

  if (data.email) {
    const existing = await Vendor.findOne({
      where: { email: data.email, store_id: data.store_id },
      attributes: ["id"],
    });
    if (existing) throw new AppError("Email already registered", 409);
  }

  if (data.tax_number) {
    const existing = await Vendor.findOne({
      where: { tax_number: data.tax_number, store_id: data.store_id },
      attributes: ["id"],
    });
    if (existing) throw new AppError("Tax number already registered", 409);
  }

  const openBal = parseFloat(data.opening_balance || 0);
  data.balance  = openBal;

  const vendor = await (openBal > 0 && data.store_id
    ? sequelize.transaction(async (t) => {
        const v = await Vendor.create(data, { transaction: t });
        await fLedger.postNamedJE({
          store_id:       data.store_id,
          reference_type: "vendor_opening",
          reference_id:   v.id,
          date:           new Date(),
          description:    `Opening balance: ${data.name}`,
          namedLines: [
            { mappingKey: "opening_balance_equity", debit: openBal, credit: 0 },
            { mappingKey: "default_creditor",       debit: 0,       credit: openBal },
          ],
          user_id: null,
        }, t);
        return v;
      })
    : Vendor.create(data));

  return getVendorById(vendor.id);
};

// ─── Update Vendor ────────────────────────────────────────────────────────────
const updateVendor = async (id, data, storeId) => {
  const vendor = await getVendorById(id, storeId);

  if (!Object.keys(data).length) throw new AppError("No fields to update", 400);

  if (data.phone) {
    const existing = await Vendor.findOne({
      where: { phone: data.phone, store_id: vendor.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Phone number already in use", 409);
  }

  if (data.email) {
    const existing = await Vendor.findOne({
      where: { email: data.email, store_id: vendor.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Email already in use", 409);
  }

  if (data.tax_number) {
    const existing = await Vendor.findOne({
      where: { tax_number: data.tax_number, store_id: vendor.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Tax number already in use", 409);
  }

  delete data.balance;
  delete data.opening_balance;

  await Vendor.update(data, { where: { id: vendor.id, store_id: vendor.store_id } });
  return getVendorById(id);
};

// ─── Delete Vendor (soft) ─────────────────────────────────────────────────────
const deleteVendor = async (id, storeId) => {
  const vendor = await getVendorById(id, storeId);
  await Vendor.update({ is_active: 0 }, { where: { id: vendor.id, store_id: vendor.store_id } });
  return { message: "Vendor deactivated successfully" };
};

// ─── Get Vendor Purchases ─────────────────────────────────────────────────────
const getVendorPurchases = async (id, store_id) => {
  await getVendorById(id);
  return Purchase.findAll({
    where: { vendor_id: id, store_id },
    attributes: [
      "id", "purchase_number", "purchase_date", "status",
      "total_amount", "paid_amount", "due_amount", "payment_status",
    ],
    include: [{ model: User, attributes: ["id", "name"] }],
    order: [["purchase_date", "DESC"]],
  });
};

// ─── Get Vendor Payments ──────────────────────────────────────────────────────
const getVendorPayments = async (id, store_id) => {
  await getVendorById(id);
  return SupplierPayment.findAll({
    where: { vendor_id: id, store_id },
    attributes: [
      "id", "amount", "payment_method", "reference_number",
      "notes", "payment_date",
    ],
    include: [
      { model: User, attributes: ["id", "name"] },
      { model: Purchase, attributes: ["id", "purchase_number"] },
    ],
    order: [["payment_date", "DESC"]],
  });
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorPurchases,
  getVendorPayments,
};
