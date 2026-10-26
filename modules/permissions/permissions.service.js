"use strict";

const { Op } = require("sequelize");
const { Permission } = require("../../database/index");
const AppError = require("../../utils/AppError");

const getAll = async ({ module: mod, search } = {}) => {
  const where = {};
  if (mod) where.module = mod;
  if (search) {
    const orClause = [
      { module: { [Op.like]: `%${search}%` } },
      { action: { [Op.like]: `%${search}%` } },
    ];
    if (mod) {
      where[Op.and] = [{ module: mod }, { [Op.or]: orClause }];
    } else {
      where[Op.or] = orClause;
    }
  }
  return Permission.findAll({
    where,
    order: [["module", "ASC"], ["action", "ASC"]],
  });
};

const getById = async (id) => {
  const perm = await Permission.findByPk(id);
  if (!perm) throw new AppError("Permission not found", 404);
  return perm;
};

const getGrouped = async () => {
  const all = await getAll();
  return all.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push({ id: p.id, action: p.action, description: p.description });
    return acc;
  }, {});
};

module.exports = { getAll, getById, getGrouped };
