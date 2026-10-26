"use strict";

const { AppConfig, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");

// ─── Parse config value based on data_type ────────────────────────────────────
const parseValue = (value, data_type) => {
  try {
    if (data_type === "number") return parseFloat(value);
    if (data_type === "boolean") return value === "true" || value === "1";
    if (data_type === "json") {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  } catch {
    return value;
  }
};

// ─── Get All Configs (global defaults merged with branch overrides) ───────────
const getAllConfigs = async (store_id) => {
  const { Op } = require("sequelize");

  // Fetch both global (store_id IS NULL) and branch-specific rows
  const where = store_id
    ? { [Op.or]: [{ store_id: null }, { store_id }] }
    : { store_id: null };

  const configs = await AppConfig.findAll({
    where,
    order: [["config_key", "ASC"], ["store_id", "ASC"]],
  });

  // Branch entry wins over global — last write per key survives
  const result = {};
  for (const c of configs) {
    // store_id-specific row always overwrites the global fallback
    if (result[c.config_key] === undefined || c.store_id !== null) {
      result[c.config_key] = {
        config_key: c.config_key,
        config_value: c.config_value,
        data_type: c.data_type,
        description: c.description,
        store_id: c.store_id,
        parsed_value: parseValue(c.config_value, c.data_type),
      };
    }
  }
  return Object.values(result);
};

// ─── Get Single Config ────────────────────────────────────────────────────────
const getConfig = async (key, store_id) => {
  let config = null;

  // Try store-specific first, then fall back to global
  if (store_id) {
    config = await AppConfig.findOne({ where: { config_key: key, store_id } });
  }
  if (!config) {
    config = await AppConfig.findOne({ where: { config_key: key, store_id: null } });
  }

  if (!config) return null; // return null instead of throwing — caller decides how to handle
  return {
    ...config.toJSON(),
    parsed_value: parseValue(config.config_value, config.data_type),
  };
};

// ─── Set Config (create or update) ───────────────────────────────────────────
const setConfig = async (data) => {
  const { config_key, config_value, data_type, description, store_id } = data;

  const [config, created] = await AppConfig.findOrCreate({
    where: { config_key, store_id: store_id || null },
    defaults: {
      config_value,
      data_type: data_type || "string",
      description: description || null,
    },
  });

  if (!created) {
    await config.update({
      config_value,
      data_type: data_type !== undefined ? data_type : config.data_type,
      description: description !== undefined ? description : config.description,
    });
  }

  return {
    ...config.toJSON(),
    parsed_value: parseValue(config.config_value, config.data_type),
  };
};

// ─── Bulk Set Configs ─────────────────────────────────────────────────────────
const bulkSetConfig = async ({ store_id, configs }) => {
  return sequelize.transaction(async (t) => {
    const results = [];
    for (const c of configs) {
      const result = await setConfig({ ...c, store_id: store_id || null });
      results.push(result);
    }
    return results;
  });
};

// ─── Delete Config ────────────────────────────────────────────────────────────
const deleteConfig = async (key, store_id) => {
  const where = { config_key: key, store_id: store_id || null };
  const config = await AppConfig.findOne({ where });
  if (!config) throw new AppError(`Config key '${key}' not found`, 404);
  await config.destroy();
  return { message: `Config '${key}' deleted successfully` };
};

module.exports = {
  getAllConfigs,
  getConfig,
  setConfig,
  bulkSetConfig,
  deleteConfig,
};
