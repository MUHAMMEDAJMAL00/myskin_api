"use strict";
const { Op } = require("sequelize");
const { TaxGroup, Product } = require("../../database/index");
const AppError = require("../../utils/AppError");

const _validateComponentsSum = (rate, components) => {
  if (!components || components.length === 0) return;
  const sum = components.reduce((acc, c) => acc + parseFloat(c.rate || 0), 0);
  if (Math.abs(sum - parseFloat(rate)) > 0.01) {
    throw new AppError(`Components sum (${sum}%) must equal total rate (${rate}%)`, 400);
  }
};

const getAll = async ({ page = 1, limit = 20, search, is_active, store_id } = {}) => {
  const where = {};
  if (store_id) where.store_id = parseInt(store_id);
  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active);
  if (search) where.name = { [Op.like]: `%${search}%` };
  const { count, rows } = await TaxGroup.findAndCountAll({
    where,
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / parseInt(limit)), data: rows };
};

const getById = async (id) => {
  const group = await TaxGroup.findByPk(id);
  if (!group) throw new AppError("Tax group not found", 404);
  return group;
};

const create = async (data) => {
  const nameWhere = { name: data.name };
  if (data.store_id) nameWhere.store_id = data.store_id;
  const existing = await TaxGroup.findOne({ where: nameWhere });
  if (existing) throw new AppError("A tax group with this name already exists in this store", 409);
  _validateComponentsSum(data.rate, data.components);
  const group = await TaxGroup.create(data);
  return getById(group.id);
};

const update = async (id, data, store_id) => {
  const group = await getById(id);
  if (store_id && parseInt(group.store_id) !== parseInt(store_id)) {
    throw new AppError("Tax group does not belong to this store", 403);
  }
  if (data.name && data.name !== group.name) {
    const nameWhere = { name: data.name };
    if (store_id) nameWhere.store_id = parseInt(store_id);
    const existing = await TaxGroup.findOne({ where: nameWhere });
    if (existing) throw new AppError("A tax group with this name already exists in this store", 409);
  }
  const checkRate = data.rate !== undefined ? data.rate : group.rate;
  const checkComps = data.components !== undefined ? data.components : group.components;
  _validateComponentsSum(checkRate, checkComps);
  if (store_id) data.store_id = parseInt(store_id);
  await TaxGroup.update(data, { where: { id } });

  // Sync tax_included on all products linked to this tax group
  const newTaxType = data.tax_type !== undefined ? data.tax_type : group.tax_type;
  const newTaxIncluded = newTaxType === "inclusive" ? 1 : 0;
  const newRate = data.rate !== undefined ? data.rate : group.rate;
  const { Product } = require("../../database/index");
  await Product.update(
    { tax_included: newTaxIncluded, tax_rate: newRate },
    { where: { tax_group_id: id } },
  );

  return getById(id);
};

const remove = async (id, store_id) => {
  const group = await getById(id);
  if (store_id && parseInt(group.store_id) !== parseInt(store_id)) {
    throw new AppError("Tax group does not belong to this store", 403);
  }
  const activeCount = await Product.count({ where: { tax_group_id: id, is_active: 1 } });
  if (activeCount > 0) throw new AppError(`Cannot delete: ${activeCount} active product(s) use this tax group. Reassign their tax group first.`, 409);
  await TaxGroup.destroy({ where: { id } });
  return { message: "Tax group deleted successfully" };
};

module.exports = { getAll, getById, create, update, remove };
