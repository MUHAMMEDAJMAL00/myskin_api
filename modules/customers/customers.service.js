"use strict";

const AppError = require("../../utils/AppError");
const { Op } = require("sequelize");
const { Customer, LoyaltyTransaction, sequelize } = require("../../database/index");
const fLedger = require("../shared/financialLedger.service");
// ─── Get All Customers ────────────────────────────────────────────────────────
const getAllCustomers = async ({ search, is_active, page = 1, limit = 20, storeId } = {}) => {
  const where = {};

  if (storeId) where.store_id = parseInt(storeId, 10);
  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active);
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Customer.findAndCountAll({
    where,
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / limit), data: rows };
};

// ─── Get Customer By ID ───────────────────────────────────────────────────────
const getCustomerById = async (id, storeId) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const customer = await Customer.findOne({ where });
  if (!customer) throw new AppError("Customer not found", 404);
  return customer;
};

// ─── Create Customer ──────────────────────────────────────────────────────────
const createCustomer = async (data) => {
  if (data.phone) {
    const existing = await Customer.findOne({
      where: { phone: data.phone, store_id: data.store_id },
      attributes: ["id"],
    });
    if (existing) throw new AppError("Phone number already registered", 409);
  }

  if (data.email) {
    const existing = await Customer.findOne({
      where: { email: data.email, store_id: data.store_id },
      attributes: ["id"],
    });
    if (existing) throw new AppError("Email already registered", 409);
  }

  const openBal = parseFloat(data.opening_balance || 0);
  data.balance  = openBal;

  const customer = await (openBal > 0 && data.store_id
    ? sequelize.transaction(async (t) => {
        const c = await Customer.create(data, { transaction: t });
        await fLedger.postNamedJE({
          store_id:       data.store_id,
          reference_type: "customer_opening",
          reference_id:   c.id,
          date:           new Date(),
          description:    `Opening balance: ${data.name}`,
          namedLines: [
            { mappingKey: "default_debtor",         debit: openBal, credit: 0 },
            { mappingKey: "opening_balance_equity", debit: 0,       credit: openBal },
          ],
          user_id: null,
        }, t);
        return c;
      })
    : Customer.create(data));

  return getCustomerById(customer.id);
};

// ─── Update Customer ──────────────────────────────────────────────────────────
const updateCustomer = async (id, data, storeId) => {
  const customer = await getCustomerById(id, storeId);

  if (!Object.keys(data).length) throw new AppError("No fields to update", 400);

  if (data.phone) {
    const existing = await Customer.findOne({
      where: { phone: data.phone, store_id: customer.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Phone number already in use", 409);
  }

  if (data.email) {
    const existing = await Customer.findOne({
      where: { email: data.email, store_id: customer.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Email already in use", 409);
  }

  await Customer.update(data, { where: { id, store_id: customer.store_id } });
  return getCustomerById(id, storeId);
};

// ─── Delete Customer (soft) ───────────────────────────────────────────────────
const deleteCustomer = async (id, storeId) => {
  const customer = await getCustomerById(id, storeId);
  await Customer.update({ is_active: 0 }, { where: { id, store_id: customer.store_id } });
  return { message: "Customer deactivated successfully" };
};

// ─── Add/Deduct Loyalty Points ────────────────────────────────────────────────
const updateLoyaltyPoints = async (
  id,
  points,
  notes = null,
  sale_id = null,
  storeId = null,
) => {
  const customer = await getCustomerById(id, storeId);
  const newPoints = parseInt(customer.loyalty_points, 10) + points;
  if (newPoints < 0) throw new AppError("Insufficient loyalty points", 400);

  await Customer.update({ loyalty_points: newPoints }, { where: { id } });

  // Log the transaction
  await LoyaltyTransaction.create({
    customer_id: id,
    sale_id: sale_id || null,
    transaction_type: points > 0 ? "earn" : "redeem",
    points: points,
    balance_after: newPoints,
    notes: notes || null,
  });

  return getCustomerById(id);
};
const getLoyaltyHistory = async (id, storeId = null) => {
  await getCustomerById(id, storeId);
  return LoyaltyTransaction.findAll({
    where: { customer_id: id },
    order: [["created_at", "DESC"]],
  });
};

// ─── Search Customer By Phone ─────────────────────────────────────────────────
const searchByPhone = async (phone, storeId) => {
  if (!phone) throw new AppError("Phone number required", 400);
  const customer = await Customer.findOne({
    where: { phone, is_active: 1, ...(storeId ? { store_id: parseInt(storeId, 10) } : {}) },
  });
  return customer || null;
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateLoyaltyPoints,
  getLoyaltyHistory,
  searchByPhone,
};
