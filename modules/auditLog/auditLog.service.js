const { Op } = require("sequelize");
const { AuditLog, User } = require("../../database/index");

// ─── Log creator — call this from any other service ──────────────────────────
exports.log = async ({
  store_id,
  user_id,
  module,
  action,
  reference_type,
  reference_id,
  old_values,
  new_values,
  ip_address,
  user_agent,
}) => {
  try {
    await AuditLog.create({
      store_id,
      user_id,
      module,
      action,
      reference_type,
      reference_id,
      old_values: old_values ? JSON.stringify(old_values) : null,
      new_values: new_values ? JSON.stringify(new_values) : null,
      ip_address,
      user_agent,
    });
  } catch (err) {
    // Never crash the main request because of audit log failure
    console.error("Audit log error:", err.message);
  }
};

// ─── Get all logs with filters ────────────────────────────────────────────────
exports.getAll = async (filters) => {
  const where = {};
  if (filters.store_id != null) where.store_id = filters.store_id;

  if (filters.module) where.module = filters.module;
  if (filters.action) where.action = filters.action;
  if (filters.user_id) where.user_id = parseInt(filters.user_id);

  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) where.created_at[Op.gte] = new Date(filters.from);
    if (filters.to) where.created_at[Op.lte] = new Date(filters.to);
  }

  const offset = (filters.page - 1) * filters.limit;

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, attributes: ["id", "name", "username"] }],
    order: [["created_at", "DESC"]],
    limit: filters.limit,
    offset,
  });

  return {
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
    logs: rows,
  };
};

exports.getOne = async (id, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  return await AuditLog.findOne({
    where,
    include: [{ model: User, attributes: ["id", "name", "username"] }],
  });
};

exports.getModules = async (storeId = null) => {
  const where = {};
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const rows = await AuditLog.findAll({
    where,
    attributes: ["module"],
    group: ["module"],
    raw: true,
  });
  return rows.map((r) => r.module);
};
