"use strict";

const { Op } = require("sequelize");
const {
  Discount,
  DiscountTier,
  OfferProduct,
  Store,
  Product,
  Category,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");
const auditLog = require("../auditLog/auditLog.service");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isDiscountValid = (discount) => {
  if (!discount.is_active) return false;
  const now = new Date();
  if (discount.start_date && new Date(discount.start_date) > now) return false;
  if (discount.end_date && new Date(discount.end_date) < now) return false;
  if (
    discount.usage_limit !== null &&
    discount.usage_count >= discount.usage_limit
  )
    return false;
  return true;
};

const computeDiscountAmount = (discount, base_amount) => {
  let amount = 0;
  if (discount.discount_type === "flat") {
    amount = parseFloat(discount.discount_value);
  } else if (discount.discount_type === "percent") {
    amount = (base_amount * parseFloat(discount.discount_value)) / 100;
    if (discount.max_discount_amount !== null) {
      amount = Math.min(amount, parseFloat(discount.max_discount_amount));
    }
  }
  return Math.min(amount, base_amount);
};

const computeValueTypeAmount = (value, value_type, base) => {
  if (value_type === "flat") return Math.min(parseFloat(value), base);
  return Math.min((base * parseFloat(value)) / 100, base);
};

const computeBulkDiscount = (tiers, quantity, unit_price) => {
  const itemTotal = quantity * unit_price;
  const sorted = [...tiers].sort(
    (a, b) => parseFloat(a.min_quantity) - parseFloat(b.min_quantity),
  );
  let matched = null;
  for (const tier of sorted) {
    const min = parseFloat(tier.min_quantity);
    const max = tier.max_quantity ? parseFloat(tier.max_quantity) : Infinity;
    if (quantity >= min && quantity <= max) matched = tier;
  }
  if (!matched) return 0;
  if (matched.discount_type === "flat")
    return Math.min(parseFloat(matched.discount_value) * quantity, itemTotal);
  return (itemTotal * parseFloat(matched.discount_value)) / 100;
};

// ─── Get All ──────────────────────────────────────────────────────────────────

const getAllDiscounts = async (store_id, filters = {}) => {
  const {
    page = 1,
    limit = 20,
    is_active,
    discount_type,
    apply_to,
    search,
  } = filters;

  const where = { store_id };
  if (is_active !== undefined) where.is_active = is_active ? 1 : 0;
  if (discount_type) where.discount_type = discount_type;
  if (apply_to) where.apply_to = apply_to;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Discount.findAndCountAll({
    where,
    distinct: true,
    include: [
      { model: DiscountTier, as: "tiers" },
      {
        model: Category,
        as: "DiscountCategory",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: OfferProduct,
        as: "OfferProducts",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sku", "barcode"],
          },
        ],
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  // Attach category_name at top level for the frontend table
  const data = rows.map((r) => {
    const obj = r.toJSON();
    obj.category_name = obj.DiscountCategory ? obj.DiscountCategory.name : null;
    return attachOfferProductSummary(obj);
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    total_pages: Math.ceil(count / limit),
    data,
  };
};

// ─── Get By ID ────────────────────────────────────────────────────────────────

const getDiscountById = async (id, store_id) => {
  if (store_id == null) throw new AppError("store_id is required", 400);
  const where = { id, store_id };

  const discount = await Discount.findOne({
    where,
    include: [
      { model: DiscountTier, as: "tiers" },
      {
        model: Category,
        as: "DiscountCategory",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: OfferProduct,
        as: "OfferProducts",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sku", "barcode"],
          },
        ],
        required: false,
      },
    ],
  });

  if (!discount) throw new AppError("Discount not found", 404);
  const offerProductIds = (discount.OfferProducts || [])
    .map((op) => op.product_id)
    .filter(Boolean)
    .join(",");
  discount.setDataValue("offer_product_ids", offerProductIds);
  discount.setDataValue("offer_products", discount.OfferProducts || []);
  return discount;
};

// ─── Shared field extractor ───────────────────────────────────────────────────

/**
 * Extracts all discount fields from request body into a clean payload.
 * Works for both create and update.
 */
const _buildPayload = (data, options = {}) => {
  const partial = !!options.partial;
  const payload = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(data, key);
  const set = (key, value) => {
    if (!partial || has(key)) payload[key] = value;
  };

  if (has("store_id")) payload.store_id = data.store_id;

  set("name", data.name);
  set("code", data.code ? data.code.toUpperCase().trim() : null);
  set("description", data.description || null);
  set("discount_type", data.discount_type);
  set("discount_value", parseFloat(data.discount_value) || 0);
  set("discount_value_type", data.discount_value_type || "percent");
  set("tax_handling", data.tax_handling || "before_discount");
  set("min_order_amount", parseFloat(data.min_order_amount) || 0);
  set(
    "max_discount_amount",
    data.max_discount_amount ? parseFloat(data.max_discount_amount) : null,
  );

  // The UI calls whole-order discounts "order"; the DB stores that as "all".
  if (!partial || has("apply_to") || has("applies_to")) {
    const sourceApplyTo = has("applies_to") ? data.applies_to : data.apply_to;
    let resolvedApplyTo = sourceApplyTo || "all";
    if (resolvedApplyTo === "order") resolvedApplyTo = "all";
    if (resolvedApplyTo === "product") resolvedApplyTo = "product";
    payload.apply_to = resolvedApplyTo;
    if (resolvedApplyTo === "all") {
      payload.apply_to_id = null;
    } else {
      set("apply_to_id", data.apply_to_id ? parseInt(data.apply_to_id) : null);
    }
  }
  set("customer_group", data.customer_group || "all");
  set("usage_limit", data.usage_limit ? parseInt(data.usage_limit) : null);
  set(
    "per_customer_limit",
    data.per_customer_limit ? parseInt(data.per_customer_limit) : null,
  );
  set("start_date", data.start_date || null);
  set("end_date", data.end_date || null);

  if (!partial || has("is_active")) {
    payload.is_active = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;
  }

  set("bogo_buy_qty", parseInt(data.bogo_buy_qty) || 0);
  set("bogo_get_qty", parseInt(data.bogo_get_qty) || 0);
  set("bogo_max_times", parseInt(data.bogo_max_times) || 0);
  set(
    "bogo_get_product_id",
    data.bogo_get_product_id ? parseInt(data.bogo_get_product_id) : null,
  );
  set("min_qty", parseInt(data.min_qty) || 0);
  set("category_id", data.category_id ? parseInt(data.category_id) : null);
  set("free_product_id", data.free_product_id ? parseInt(data.free_product_id) : null);

  if (!partial || has("tiers")) payload.tiers = data.tiers;

  return payload;
};

const normalizeProductIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((id) => parseInt(id)).filter((id) => id > 0);
  }
  if (value === undefined || value === null) return undefined;
  if (value === "") return [];
  return String(value)
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((id) => id > 0);
};

const attachOfferProductSummary = (obj) => {
  const offerProducts = obj.OfferProducts || [];
  obj.offer_product_ids = offerProducts
    .map((op) => op.product_id)
    .filter(Boolean)
    .join(",");
  obj.offer_products = offerProducts;
  return obj;
};

// ─── Create ───────────────────────────────────────────────────────────────────

const createDiscount = async (data, user_id) => {
  const payload = _buildPayload(data);
  const { store_id, code, discount_type, tiers, ...fields } = payload;
  const offerProductIds =
    normalizeProductIds(data.offer_product_ids) ??
    normalizeProductIds(data.product_ids);

  // Validate store
  const store = await Store.findByPk(store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);

  // Unique code per store
  if (code) {
    const existing = await Discount.findOne({
      where: { code, is_active: 1, ...(store_id != null ? { store_id } : {}) },
    });
    if (existing)
      throw new AppError(`Discount code "${code}" already exists`, 409);
  }

  // Validate FK references
  await _validateRefs(payload);

  return sequelize.transaction(async (t) => {
    const discount = await Discount.create(
      { store_id, code, discount_type, ...fields },
      { transaction: t },
    );

    if (discount_type === "bulk" && tiers && tiers.length > 0) {
      await DiscountTier.bulkCreate(
        tiers.map((tier) => ({ ...tier, discount_id: discount.id })),
        { transaction: t },
      );
    }

    if (offerProductIds !== undefined) {
      await setOfferProducts(discount.id, offerProductIds, t);
    }

    const result = await Discount.findOne({
      where: { id: discount.id },
      include: [
        { model: DiscountTier, as: "tiers" },
        {
          model: OfferProduct,
          as: "OfferProducts",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "sku", "barcode"],
            },
          ],
          required: false,
        },
      ],
      transaction: t,
    });

    await auditLog.log({
      store_id,
      user_id,
      module: "discounts",
      action: "create",
      reference_type: "discount",
      reference_id: discount.id,
      new_values: {
        name: fields.name,
        code,
        discount_type,
        discount_value: fields.discount_value,
      },
    });

    const resultObj = result.toJSON();
    return attachOfferProductSummary(resultObj);
  });
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updateDiscount = async (id, data, user_id, store_id) => {
  const discount = await getDiscountById(id, store_id);
  const old_values = discount.toJSON();

  const payload = _buildPayload({ ...data, store_id }, { partial: true });
  const { tiers, store_id: _sid, ...updateFields } = payload;
  const offerProductIds =
    normalizeProductIds(data.offer_product_ids) ??
    normalizeProductIds(data.product_ids);

  // Unique code check if changing
  if (updateFields.code && updateFields.code !== discount.code) {
    const existing = await Discount.findOne({
      where: {
        store_id,
        code: updateFields.code,
        is_active: 1,
        id: { [Op.ne]: id },
      },
    });
    if (existing)
      throw new AppError(
        `Discount code "${updateFields.code}" already exists`,
        409,
      );
  }

  await _validateRefs(payload);

  return sequelize.transaction(async (t) => {
    await discount.update(updateFields, { transaction: t });

    if (tiers !== undefined) {
      await DiscountTier.destroy({
        where: { discount_id: id },
        transaction: t,
      });
      if (tiers && tiers.length > 0) {
        await DiscountTier.bulkCreate(
          tiers.map((tier) => ({ ...tier, discount_id: id })),
          { transaction: t },
        );
      }
    }

    if (offerProductIds !== undefined) {
      await setOfferProducts(id, offerProductIds, t);
    }

    const result = await getDiscountById(id, store_id);

    await auditLog.log({
      store_id,
      user_id,
      module: "discounts",
      action: "update",
      reference_type: "discount",
      reference_id: id,
      old_values,
      new_values: updateFields,
    });

    return result;
  });
};

// ─── Soft Delete ──────────────────────────────────────────────────────────────

const deleteDiscount = async (id, user_id, store_id) => {
  const discount = await getDiscountById(id, store_id);
  const oldValues = { name: discount.name, code: discount.code };

  await sequelize.transaction(async (t) => {
    await Product.update(
        { discount_id: null },
        { where: { discount_id: id }, transaction: t },
    );
    await DiscountTier.destroy({ where: { discount_id: id }, transaction: t });
    await discount.destroy({ transaction: t });
  });

  await auditLog.log({
    store_id,
    user_id,
    module: "discounts",
    action: "delete",
    reference_type: "discount",
    reference_id: id,
    old_values: oldValues,
  });

  return { message: "Discount deleted permanently" };
};

// ─── FK Validator (shared between create & update) ────────────────────────────

const _validateRefs = async (payload) => {
  const { discount_type, category_id, bogo_get_product_id, free_product_id } =
    payload;

  if (discount_type === "category" && category_id) {
    const cat = await Category.findByPk(category_id, { attributes: ["id"] });
    if (!cat) throw new AppError("Category not found", 404);
  }
  if (bogo_get_product_id) {
    const p = await Product.findByPk(bogo_get_product_id, {
      attributes: ["id"],
    });
    if (!p) throw new AppError("BOGO free product not found", 404);
  }
  if (free_product_id) {
    const p = await Product.findByPk(free_product_id, { attributes: ["id"] });
    if (!p) throw new AppError("Free item product not found", 404);
  }
};

// ─── Validate / Apply Discount Code (called from POS before finalising sale) ──

const validateDiscountCode = async (data) => {
  const {
    store_id,
    code,
    cart_total = 0,
    customer_id,
    customer_group,
    items = [],
  } = data;

  // Find by code OR use provided _discount (internal bypass)
  let discount;
  if (data._discount) {
    discount = data._discount;
  } else if (code) {
    const discWhere = { code, is_active: 1 };
    if (store_id != null) discWhere.store_id = store_id;
    discount = await Discount.findOne({
      where: discWhere,
      include: [
        { model: DiscountTier, as: "tiers" },
        {
          model: OfferProduct,
          as: "OfferProducts",
          attributes: ["product_id"],
          required: false,
        },
      ],
    });
    if (!discount) throw new AppError("Invalid or inactive discount code", 404);
  } else {
    throw new AppError("Discount code is required", 400);
  }

  if (!isDiscountValid(discount)) {
    throw new AppError(
      "Discount is expired, exhausted, or not yet active",
      400,
    );
  }

  // Customer group check
  if (
    discount.customer_group !== "all" &&
    discount.customer_group !== (customer_group || "all")
  ) {
    throw new AppError(
      `This discount is restricted to ${discount.customer_group} customers`,
      403,
    );
  }

  let discount_amount = 0;
  const breakdown = [];

  switch (discount.discount_type) {
    case "percent":
    case "flat": {
      if (cart_total < parseFloat(discount.min_order_amount)) {
        throw new AppError(
          `Minimum order of ₹${discount.min_order_amount} required`,
          400,
        );
      }
      let applicable_total = cart_total;
      if (discount.apply_to === "product") {
        const scoped = items.filter(
          (i) => i.product_id === discount.apply_to_id,
        );
        applicable_total = scoped.reduce(
          (s, i) => s + i.quantity * i.unit_price,
          0,
        );
      } else if (discount.apply_to === "category") {
        const scoped = items.filter(
          (i) => i.category_id === discount.apply_to_id,
        );
        applicable_total = scoped.reduce(
          (s, i) => s + i.quantity * i.unit_price,
          0,
        );
      }
      discount_amount = computeDiscountAmount(discount, applicable_total);
      break;
    }

    case "bogo": {
      const buyQty = parseInt(discount.bogo_buy_qty) || 1;
      const getQty = parseInt(discount.bogo_get_qty) || 1;
      const maxTimes = parseInt(discount.bogo_max_times) || Infinity;
      const freeProductId = discount.bogo_get_product_id;
      const buyProductIds = (discount.OfferProducts || []).map((op) => op.product_id);

      for (const item of items) {
        if (buyProductIds.length > 0) {
          if (!buyProductIds.includes(item.product_id)) continue;
        } else if (freeProductId && item.product_id !== freeProductId) {
          continue;
        }

        const eligibleSets = Math.floor(item.quantity / (buyQty + getQty));
        const timesApplied =
          maxTimes === 0 ? eligibleSets : Math.min(eligibleSets, maxTimes);
        if (timesApplied > 0) {
          const free_qty = timesApplied * getQty;
          const item_discount = free_qty * parseFloat(item.unit_price);
          discount_amount += item_discount;
          breakdown.push({
            product_id: item.product_id,
            free_qty,
            discount: item_discount,
          });
        }
      }
      break;
    }

    case "min_qty": {
      const totalQty = items.reduce(
        (s, i) => s + (parseInt(i.quantity) || 0),
        0,
      );
      if (totalQty < parseInt(discount.min_qty)) {
        throw new AppError(
          `Add at least ${discount.min_qty} units to use this discount`,
          400,
        );
      }
      discount_amount = computeValueTypeAmount(
        discount.discount_value,
        discount.discount_value_type,
        cart_total,
      );
      break;
    }

    case "spend_get": {
      if (cart_total < parseFloat(discount.min_order_amount)) {
        throw new AppError(
          `Spend at least ₹${discount.min_order_amount} to unlock this discount`,
          400,
        );
      }
      discount_amount = computeValueTypeAmount(
        discount.discount_value,
        discount.discount_value_type,
        cart_total,
      );
      break;
    }

    case "category": {
      const catId = discount.category_id;
      const scoped = items.filter((i) => i.category_id === catId);
      if (!scoped.length) {
        throw new AppError("No items from the required category in cart", 400);
      }
      const catTotal = scoped.reduce(
        (s, i) => s + i.quantity * i.unit_price,
        0,
      );
      discount_amount = computeValueTypeAmount(
        discount.discount_value,
        discount.discount_value_type,
        catTotal,
      );
      breakdown.push({
        category_id: catId,
        catTotal,
        discount: discount_amount,
      });
      break;
    }

    case "bundle": {
      const requiredIds = (discount.OfferProducts || [])
        .map((op) => op.product_id)
        .filter(Boolean);

      const cartProductIds = items.map((i) => i.product_id);
      const allPresent = requiredIds.every((rid) =>
        cartProductIds.includes(rid),
      );

      if (!allPresent) {
        throw new AppError(
          "Cart must contain all required bundle products to use this discount",
          400,
        );
      }
      const bundleTotal = items
        .filter((i) => requiredIds.includes(i.product_id))
        .reduce((s, i) => s + i.quantity * i.unit_price, 0);
      discount_amount = computeValueTypeAmount(
        discount.discount_value,
        discount.discount_value_type,
        bundleTotal,
      );
      break;
    }

    case "free_item": {
      if (cart_total < parseFloat(discount.min_order_amount)) {
        throw new AppError(
          `Spend at least ₹${discount.min_order_amount} to get the free item`,
          400,
        );
      }
      // Discount amount is 0 — the POS should add the free product as a 0-price line
      discount_amount = 0;
      breakdown.push({
        free_product_id: discount.free_product_id,
        note: "Add this product to cart at ₹0",
      });
      break;
    }

    case "bulk": {
      // Legacy bulk tier logic
      for (const item of items) {
        const item_discount = computeBulkDiscount(
          discount.tiers,
          item.quantity,
          item.unit_price,
        );
        discount_amount += item_discount;
        if (item_discount > 0)
          breakdown.push({
            product_id: item.product_id,
            discount: item_discount,
          });
      }
      break;
    }

    default:
      throw new AppError("Unknown discount type", 400);
  }

  // ── Per-bill purchase rules ─────────────────────────────────────────────────
  // single_use_per_bill: entire offer fires at most once per transaction.
  // For BOGO / bulk / category we may have already accumulated across multiple
  // breakdown entries — cap the total discount to one trigger's worth.
  if (discount.single_use_per_bill && breakdown.length > 1) {
    // Keep only the first (highest-value) breakdown entry and re-sum
    const firstEntry = breakdown.reduce((best, entry) => {
      const entryAmt = entry.discount || entry.catTotal || 0;
      const bestAmt  = best.discount  || best.catTotal  || 0;
      return entryAmt > bestAmt ? entry : best;
    }, breakdown[0]);
    discount_amount = firstEntry.discount || firstEntry.catTotal || discount_amount;
    breakdown.splice(0, breakdown.length, firstEntry);
  } else if (discount.single_use_per_bill) {
    // Already one entry or a scalar — discount_amount is already the first-fire amount
    // No further adjustment needed
  }

  // max_per_transaction: cap total triggers at this number.
  // Relevant for BOGO / bulk where multiple items can each independently trigger.
  if (
    discount.max_per_transaction !== null &&
    discount.max_per_transaction !== undefined &&
    breakdown.length > discount.max_per_transaction
  ) {
    // Sort breakdown by discount descending, keep only max_per_transaction entries
    const sorted = [...breakdown].sort((a, b) => (b.discount || 0) - (a.discount || 0));
    const kept   = sorted.slice(0, discount.max_per_transaction);
    discount_amount = kept.reduce((s, e) => s + (e.discount || 0), 0);
    breakdown.splice(0, breakdown.length, ...kept);
  }

  discount_amount = Math.round(discount_amount * 100) / 100;

  return {
    discount_id: discount.id,
    name: discount.name,
    code: discount.code,
    discount_type: discount.discount_type,
    discount_amount,
    breakdown,
    free_product_id: discount.free_product_id || null,
    single_use_per_bill: !!discount.single_use_per_bill,
    max_per_transaction: discount.max_per_transaction || null,
    message: `Discount applied: ${discount.name}`,
  };
};

// ─── Auto-apply discounts (no code — triggered by cart conditions) ─────────────

/**
 * Called from the POS cart to find all discounts that auto-apply
 * (no code required) and match the current cart.
 * Returns an array of applicable results — POS picks the best or shows all.
 */
const getAutoApplyDiscounts = async (store_id, cart_data) => {
  const { cart_total = 0, items = [], customer_group = "all" } = cart_data;
  const now = new Date();

  const candidates = await Discount.findAll({
    where: {
      store_id,
      is_active: 1,
      code: null, // auto-apply only
      [Op.and]: [
        { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
        { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] },
      ],
    },
    include: [
      { model: DiscountTier, as: "tiers" },
      {
        model: Category,
        as: "DiscountCategory",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });

  const results = [];

  for (const d of candidates) {
    try {
      const result = await validateDiscountCode({
        store_id,
        code: d.code, // null — won't be reached; we call internal directly
        cart_total,
        items,
        customer_group,
        _discount: d, // internal bypass — skip code lookup
      });
      results.push(result);
    } catch (_) {
      // Condition not met — skip silently
    }
  }

  return results;
};

// ─── Increment usage (called from sale service at completion) ─────────────────

const incrementUsage = async (discount_id, t = null) => {
  const opts = t ? { transaction: t } : {};
  await Discount.increment("usage_count", {
    by: 1,
    where: { id: discount_id },
    ...opts,
  });
};

const decrementUsage = async (discount_id, t = null) => {
  const opts = t ? { transaction: t } : {};
  await Discount.decrement("usage_count", {
    by: 1,
    where: { id: discount_id, usage_count: { [Op.gt]: 0 } },
    ...opts,
  });
};

// ─── Active list for POS dropdown ─────────────────────────────────────────────

const getActiveDiscounts = async (store_id) => {
  const now = new Date();
  const where = {
    is_active: 1,
    [Op.and]: [
      { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
      { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] },
    ],
  };
  if (store_id != null) where.store_id = store_id;
  return Discount.findAll({
    where,
    include: [{ model: DiscountTier, as: "tiers" }],
    order: [["name", "ASC"]],
  });
};

// ✔ NEW: Get products associated with an offer (relational) ──────────────────

const getOfferProducts = async (offer_id) => {
  const { OfferProduct } = require("../../database/index");
  return OfferProduct.findAll({
    where: { offer_id },
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "name", "sku"],
      },
    ],
    order: [["sequence", "ASC"]],
  });
};

// ✔ NEW: Set/update products for bundle offer ────────────────────────────────

const setOfferProducts = async (offer_id, product_ids, transaction = null) => {
  const { OfferProduct } = require("../../database/index");
  const opts = transaction ? { transaction } : {};

  // Clear existing
  await OfferProduct.destroy({ where: { offer_id }, ...opts });

  // Insert new
  if (product_ids && product_ids.length > 0) {
    const now = new Date();
    const records = product_ids.map((pid, idx) => ({
      offer_id,
      product_id: parseInt(pid),
      sequence: idx,
      created_at: now,
    }));
    await OfferProduct.bulkCreate(records, opts);
  }
};

// ✔ NEW: Create/update offer conflict rule ──────────────────────────────────

const setOfferConflict = async (
  store_id,
  offer_id_1,
  offer_id_2,
  conflict_rule = "best_discount",
  offer_priority = null,
) => {
  const { OfferConflict } = require("../../database/index");

  // Upsert (find or create)
  const [rule, created] = await OfferConflict.findOrCreate({
    where: {
      store_id,
      [Op.or]: [
        { offer_id_1, offer_id_2 },
        { offer_id_1: offer_id_2, offer_id_2: offer_id_1 },
      ],
    },
    defaults: {
      store_id,
      offer_id_1,
      offer_id_2,
      conflict_rule,
      offer_priority,
      is_active: 1,
    },
  });

  if (!created) {
    await rule.update({
      conflict_rule,
      offer_priority,
      is_active: 1,
    });
  }

  return rule;
};

// ✔ NEW: Get offer audit trail ──────────────────────────────────────────────

const getOfferAuditTrail = async (store_id, filters = {}) => {
  const { OfferAuditLog } = require("../../database/index");
  const {
    offer_id,
    sale_id,
    product_id,
    from_date,
    to_date,
    page = 1,
    limit = 50,
  } = filters;

  const where = { store_id };
  if (offer_id) where.offer_id = offer_id;
  if (sale_id) where.sale_id = sale_id;
  if (product_id) where.product_id = product_id;

  if (from_date || to_date) {
    where.created_at = {};
    if (from_date) where.created_at[Op.gte] = new Date(from_date);
    if (to_date) where.created_at[Op.lte] = new Date(to_date);
  }

  const { count, rows } = await OfferAuditLog.findAndCountAll({
    where,
    include: [
      { model: Discount, attributes: ["name", "code", "discount_type"] },
      { model: Product, attributes: ["name", "sku"] },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows,
  };
};

// ─── Cleanup Expired Discounts ────────────────────────────────────────────────
const cleanupExpiredDiscounts = async () => {
  try {
    const now = new Date();
    const [updated] = await Discount.update(
      { is_active: 0 },
      {
        where: {
          is_active: 1,
          end_date: { [Op.ne]: null, [Op.lt]: now },
        },
      },
    );
    if (updated > 0) {
      console.log(`[DISCOUNT] Auto-deactivated ${updated} expired discount(s)`);
    }
  } catch (err) {
    console.error("[DISCOUNT] Cleanup error:", err.message);
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountCode,
  getAutoApplyDiscounts,
  incrementUsage,
  decrementUsage,
  getActiveDiscounts,
  cleanupExpiredDiscounts,
  // ✔ NEW: Relational and conflict management
  getOfferProducts,
  setOfferProducts,
  setOfferConflict,
  getOfferAuditTrail,
};
