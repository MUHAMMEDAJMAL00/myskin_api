"use strict";

const { Unit, UomValue } = require("../../database/index");
const AppError = require("../../utils/AppError");
const { Op } = require("sequelize");

const _valuesInclude = {
  model: UomValue,
  as: "UomValues",
  where: { is_active: 1 },
  required: false,
  order: [["value", "ASC"]],
};

// Units with store_id = NULL are "global" (seeded) — visible to all stores.
// Units with a store_id are visible only to that store.
// Pass undefined as store_id to skip the filter (superadmin sees all).
const _storeWhere = (store_id) => {
  if (store_id === undefined) return {};
  return store_id
    ? { [Op.or]: [{ store_id }, { store_id: null }] }
    : { store_id: null };
};

const getAllUnits = async ({
  page = 1,
  limit = 20,
  search,
  is_active,
  store_id,
} = {}) => {
  const where = { ..._storeWhere(store_id) };
  if (is_active !== undefined && is_active !== "")
    where.is_active = parseInt(is_active);
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { symbol: { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Unit.findAndCountAll({
    where,
    include: [_valuesInclude],
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data: rows,
  };
};

const getUnitById = async (id, store_id) => {
  const where = { id, ..._storeWhere(store_id) };
  const unit = await Unit.findOne({ where, include: [_valuesInclude] });
  if (!unit) throw new AppError("Unit not found", 404);
  return unit;
};

const createUnit = async (data) => {
  const existing = await Unit.findOne({
    where: { name: data.name, store_id: data.store_id || null, is_active: 1 }, // ← add is_active: 1
    attributes: ["id"],
  });
  if (existing) throw new AppError("Unit name already exists", 409);
  return Unit.create(data);
};
const updateUnit = async (id, data, store_id) => {
  const unit = await getUnitById(id, store_id);
  if (!Object.keys(data).length) throw new AppError("No fields to update", 400);
  if (data.name) {
    const existing = await Unit.findOne({
      where: { name: data.name, store_id: store_id || null },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Unit name already in use", 409);
  }
  await Unit.update(data, { where: { id, store_id: unit.store_id } });
  return getUnitById(id, store_id);
};

const deleteUnit = async (id, store_id) => {
  const unit = await getUnitById(id, store_id);
  await Unit.update({ is_active: 0 }, { where: { id, store_id: unit.store_id } });
  return { message: "Unit deactivated successfully" };
};

// ── UOM Values ────────────────────────────────────────────────────────────────

const getUnitValues = async (unitId, store_id) => {
  await getUnitById(unitId, store_id);
  return UomValue.findAll({
    where: { unit_id: unitId, is_active: 1 },
    order: [["value", "ASC"]],
  });
};

const addUnitValue = async (unitId, value, store_id) => {
  await getUnitById(unitId, store_id);
  const existing = await UomValue.findOne({
    where: { unit_id: unitId, value },
  });
  if (existing) {
    if (existing.is_active)
      throw new AppError("Value already exists for this unit", 409);
    await existing.update({ is_active: 1 });
    return existing;
  }
  return UomValue.create({ unit_id: unitId, value });
};

const removeUnitValue = async (unitId, valueId, store_id) => {
  await getUnitById(unitId, store_id);
  const val = await UomValue.findOne({
    where: { id: valueId, unit_id: unitId },
  });
  if (!val) throw new AppError("Value not found", 404);
  await val.update({ is_active: 0 });
  return { message: "Value removed successfully" };
};

module.exports = {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitValues,
  addUnitValue,
  removeUnitValue,
};
