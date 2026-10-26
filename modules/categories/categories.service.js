"use strict";

const { Category, Product, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const { Op } = require("sequelize");

const getAllCategories = async ({ page, limit, search, is_active, parent_id, exclude_id, storeId, filterByStore = false } = {}) => {
  const where = {};
  if (filterByStore && storeId) where.store_id = parseInt(storeId, 10);
  if (is_active !== "all") {
    where.is_active = (is_active !== undefined && is_active !== "") ? parseInt(is_active) : 1;
  }
  if (parent_id !== undefined) {
    where.parent_id = (parent_id === "" || parent_id === "null" || parent_id === null)
      ? null
      : parseInt(parent_id);
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { slug: { [Op.like]: `%${search}%` } },
    ];
  }
  if (exclude_id) {
    const excludeId = parseInt(exclude_id);
    const descendants = [excludeId];
    let currentLevelIds = [excludeId];
    let depth = 0;
    while (currentLevelIds.length > 0 && depth < 50) {
      const children = await Category.findAll({
        attributes: ["id"],
        where: { parent_id: { [Op.in]: currentLevelIds } },
        raw: true,
      });
      const childIds = children.map((c) => c.id);
      descendants.push(...childIds);
      currentLevelIds = childIds;
      depth++;
    }
    where.id = { [Op.notIn]: descendants };
  }

  const include = [
    { model: Category, as: "parent", attributes: ["id", "name", "slug"] },
    { model: Category, as: "children", attributes: ["id", "name", "slug"], where: { is_active: 1 }, required: false },
  ];
  const order = [["sort_order", "ASC"], ["name", "ASC"]];

  if (!page) {
    const rows = await Category.findAll({ where, include, order });
    return rows.map((r) => {
      const json = r.toJSON();
      json.has_children = json.children && json.children.length > 0;
      return json;
    });
  }

  const rows = await Category.findAll({
    where,
    include,
    order,
  });

  const byParent = new Map();
  const byId = new Map();
  rows.forEach((row) => {
    const item = row.toJSON();
    item.has_children = item.children && item.children.length > 0;
    byId.set(item.id, item);
    const parentId = item.parent_id || null;
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(item);
  });

  const flattened = [];
  const visit = (items) => {
    items.forEach((item) => {
      flattened.push(item);
      visit(byParent.get(item.id) || []);
    });
  };

  const roots = Array.from(byId.values()).filter(
    (item) => !item.parent_id || !byId.has(item.parent_id),
  );
  visit(roots);

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const offset = (parsedPage - 1) * parsedLimit;
  const data = flattened.slice(offset, offset + parsedLimit);

  return {
    total: flattened.length,
    page: parsedPage,
    limit: parsedLimit,
    total_pages: Math.ceil(flattened.length / parsedLimit),
    data,
  };
};
const getCategoryById = async (id, storeId) => {
  const category = await Category.findByPk(id, {
    include: [
      { model: Category, as: "parent",   attributes: ["id", "name", "slug"] },
      { model: Category, as: "children", attributes: ["id", "name", "slug"], where: { is_active: 1 }, required: false },
    ],
  });
  if (!category || (storeId && category.store_id !== parseInt(storeId, 10)))
    throw new AppError("Category not found", 404);
  const json = category.toJSON();
  json.has_children = json.children && json.children.length > 0;
  return json;
};

const ensureValidParent = async (categoryId, parentId, storeId) => {
  if (!parentId) return;

  const parent = await Category.findByPk(parentId, {
    attributes: ["id", "parent_id", "store_id"],
  });
  if (!parent) throw new AppError("Parent category not found", 404);

  if (storeId && parent.store_id !== parseInt(storeId, 10)) {
    throw new AppError("Parent category belongs to a different store", 400);
  }

  if (categoryId && parseInt(parentId) === parseInt(categoryId)) {
    throw new AppError("Category cannot be its own parent", 400);
  }

  let cursor = parent;
  while (cursor && cursor.parent_id) {
    if (parseInt(cursor.parent_id) === parseInt(categoryId)) {
      throw new AppError("Category cannot be moved under its own child", 400);
    }
    cursor = await Category.findByPk(cursor.parent_id, {
      attributes: ["id", "parent_id"],
    });
  }
};

const createCategory = async (data) => {
  const existing = await Category.findOne({
    where: { slug: data.slug, store_id: data.store_id },
    attributes: ["id"],
  });
  if (existing) throw new AppError("Slug already exists", 409);

  if (data.parent_id) {
    await ensureValidParent(null, data.parent_id, data.store_id);
  }

  const category = await Category.create(data);
  return getCategoryById(category.id);
};

const updateCategory = async (id, data, storeId) => {
  const category = await getCategoryById(id, storeId);

  if (!Object.keys(data).length) throw new AppError("No fields to update", 400);

  if (data.slug) {
    const existing = await Category.findOne({
      where: { slug: data.slug, store_id: category.store_id },
      attributes: ["id"],
    });
    if (existing && existing.id !== parseInt(id))
      throw new AppError("Slug already in use", 409);
  }

  if (data.parent_id) await ensureValidParent(id, data.parent_id, category.store_id);

  await Category.update(data, { where: { id, store_id: category.store_id } });
  return getCategoryById(id);
};

const deleteCategory = async (id, storeId) => {
  const category = await getCategoryById(id, storeId);

  // Block if has active products before moving children.
  const hasProducts = await Product.count({
    where: { category_id: id, is_active: 1, store_id: category.store_id },
  });
  if (hasProducts)
    throw new AppError("Cannot delete category with active products", 400);

  // Reassign active children to top-level instead of blocking
  const childCount = await Category.count({
    where: { parent_id: id, is_active: 1 },
  });

  await sequelize.transaction(async (t) => {
    if (childCount > 0) {
      await Category.update(
        { parent_id: null },
        { where: { parent_id: id, is_active: 1 }, transaction: t },
      );
      await Category.update(
        { parent_id: null },
        { where: { parent_id: id, is_active: 0 }, transaction: t },
      );
    }

    await Category.update(
      { is_active: 0 },
      { where: { id, store_id: category.store_id }, transaction: t },
    );
  });
  return { message: "Category deactivated successfully" };
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
