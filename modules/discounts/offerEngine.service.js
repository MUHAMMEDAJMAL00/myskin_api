"use strict";

const { Op } = require("sequelize");
const {
  Discount,
  OfferProduct,
  OfferConflict,
  OfferAuditLog,
  Product,
  ProductVariant,
  Store,
  Sale,
  sequelize,
} = require("../../database/index");
const AppError = require("../../utils/AppError");

/**
 * OfferEngine Service
 *
 * Core offer evaluation engine - SEPARATED from billing logic
 * Responsibilities:
 * 1. Find eligible offers for a cart/transaction
 * 2. Resolve conflicts when multiple offers apply
 * 3. Calculate discount amounts with tax handling
 * 4. Support caching for performance
 * 5. Generate audit logs for compliance
 *
 * Architecture:
 * - evaluateOffers(cart, customer, store) → returns applied offers in priority order
 * - resolveConflicts(offers, rule) → selects best offer(s)
 * - calculateDiscount(offer, applicableAmount) → returns discount amount
 * - auditOfferApplication(...) → logs for compliance
 *
 * This is PURE EVALUATION. Billing logic handles actual deductions.
 */

class OfferEngine {
  /**
   * Evaluate all eligible offers for a cart
   * @param {Object} cart - { items: [{product_id, variant_id, qty, unit_price}], ...}
   * @param {Object} customer - { id, group: 'all'|'member'|'vip'|'wholesale' }
   * @param {Integer} store_id
   * @returns {Promise<Array>} - [{offer_id, product_id, base_amount, discount_amount, ...}]
   */
  static async evaluateOffers(cart, customer, store_id) {
    const eligible = [];

    // 1. Get all active offers for this store
    const offers = await Discount.findAll({
      where: {
        store_id,
        is_active: 1,
        // Validity checks
        [Op.and]: [
          {
            [Op.or]: [
              { start_date: null },
              { start_date: { [Op.lte]: new Date() } },
            ],
          },
          {
            [Op.or]: [
              { end_date: null },
              { end_date: { [Op.gte]: new Date() } },
            ],
          },
        ],
      },
      include: [
        {
          model: OfferProduct,
          as: "OfferProducts",
          required: false,
        },
      ],
    });

    // 2. For each offer, check if it qualifies
    for (const offer of offers) {
      // Check usage limits
      if (!await this._isWithinUsageLimits(offer, customer.id, store_id)) continue;

      // Check customer group
      if (
        offer.customer_group !== "all" &&
        offer.customer_group !== customer.group
      ) {
        continue;
      }

      // Check specific conditions by discount type
      const result = await this._evaluateOfferCondition(offer, cart, customer);

      if (result && result.eligible) {
        eligible.push({
          ...result,
          offer_id: offer.id,
          offer_code: offer.code,
          offer_name: offer.name,
          offer_type: offer.discount_type,
          discount_value: parseFloat(offer.discount_value) || 0,
          discount_value_type: offer.discount_value_type || "percent",
          max_discount_amount: offer.max_discount_amount
            ? parseFloat(offer.max_discount_amount)
            : null,
          tax_handling: offer.tax_handling || "before_discount",
          conflict_group: this._getConflictGroup(offer.discount_type),
        });
      }
    }

    // 3. Resolve conflicts within conflict groups
    const resolved = await this._resolveConflicts(eligible);

    return resolved;
  }

  /**
   * Check if offer qualifies based on its type and cart contents
   */
  static async _evaluateOfferCondition(offer, cart, customer) {
    const cartTotal = this._calculateCartTotal(cart);
    const cartItemCount = this._calculateCartItemCount(cart);

    switch (offer.discount_type) {
      case "flat":
      case "percent":
        // Apply to specific products, categories, or all
        if (offer.apply_to === "product" && offer.apply_to_id) {
          const product = cart.items.find(
            (i) => i.product_id === offer.apply_to_id,
          );
          if (!product) return null;
          return {
            eligible: true,
            base_amount: product.qty * product.unit_price,
            product_id: offer.apply_to_id,
          };
        }
        if (offer.apply_to === "category" && offer.apply_to_id) {
          const categoryTotal = this._calculateCategoryTotal(
            cart,
            offer.apply_to_id,
          );
          if (categoryTotal <= 0) return null;
          return {
            eligible: true,
            base_amount: categoryTotal,
            product_id: null,
            category_id: offer.apply_to_id,
          };
        }
        // All products
        if (cartTotal >= offer.min_order_amount) {
          return {
            eligible: true,
            base_amount: cartTotal,
            product_id: null,
          };
        }
        return null;

      case "min_qty":
        {
          const targetProductIds = (offer.OfferProducts || []).map((op) => op.product_id);
          const scopedItems = targetProductIds.length
            ? cart.items.filter((i) => targetProductIds.includes(i.product_id))
            : cart.items;
          const scopedQty = scopedItems.reduce((sum, item) => sum + item.qty, 0);
          const scopedTotal = scopedItems.reduce(
            (sum, item) => sum + item.qty * item.unit_price,
            0,
          );
          if (scopedQty < offer.min_qty) return null;
          return {
            eligible: true,
            base_amount: scopedTotal,
            product_id: targetProductIds.length === 1 ? targetProductIds[0] : null,
            offer_products: targetProductIds,
          };
        }

      case "spend_get":
        if (cartTotal >= offer.min_order_amount) {
          return {
            eligible: true,
            base_amount: cartTotal,
            product_id: null,
          };
        }
        return null;

      case "bogo":
        {
          const targetProductIds = (offer.OfferProducts || []).map((op) => op.product_id);
          const bogoProduct = cart.items.find((i) =>
            targetProductIds.length
              ? targetProductIds.includes(i.product_id)
              : i.product_id === offer.apply_to_id,
          );
          if (!bogoProduct) return null;
          if (bogoProduct.qty < offer.bogo_buy_qty) return null;

          return {
            eligible: true,
            base_amount: bogoProduct.qty * bogoProduct.unit_price,
            product_id: bogoProduct.product_id,
            bogo_get_product_id: offer.bogo_get_product_id,
            offer_products: targetProductIds,
          };
        }

      case "bundle":
        // All products in bundle must be in cart
        const bundleProducts = offer.OfferProducts || [];
        if (bundleProducts.length === 0) return null;

        const allInCart = bundleProducts.every((bp) =>
          cart.items.some((i) => i.product_id === bp.product_id),
        );
        if (!allInCart) return null;

        const bundleTotal = bundleProducts.reduce((sum, bp) => {
          const item = cart.items.find((i) => i.product_id === bp.product_id);
          return sum + (item ? item.qty * item.unit_price : 0);
        }, 0);

        return {
          eligible: true,
          base_amount: bundleTotal,
          product_id: null,
          bundle_products: bundleProducts.map((bp) => bp.product_id),
        };

      case "category":
        const categoryTotal = this._calculateCategoryTotal(
          cart,
          offer.category_id,
        );
        if (categoryTotal > 0) {
          return {
            eligible: true,
            base_amount: categoryTotal,
            product_id: null,
            category_id: offer.category_id,
          };
        }
        return null;

      case "free_item":
        if (cartTotal >= offer.min_order_amount) {
          return {
            eligible: true,
            base_amount: cartTotal,
            product_id: null,
            free_product_id: offer.free_product_id,
          };
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Resolve conflicts between multiple eligible offers
   */
  static async _resolveConflicts(eligibleOffers) {
    // Group offers by conflict group (can't use same offer twice on same item)
    const groups = {};
    for (const offer of eligibleOffers) {
      const group = offer.conflict_group;
      if (!groups[group]) groups[group] = [];
      groups[group].push(offer);
    }

    const resolved = [];

    // For each group, apply conflict resolution rule
    for (const group in groups) {
      const groupOffers = groups[group];

      if (groupOffers.length === 1) {
        resolved.push(groupOffers[0]);
        continue;
      }

      // Multiple offers in same conflict group - need resolution rule
      const rule = await this._getConflictRule(groupOffers);

      if (rule && rule.conflict_rule === "priority") {
        // Use the priority offer
        const winner = groupOffers[rule.offer_priority - 1] || groupOffers[0];
        resolved.push({
          ...winner,
          conflict_resolution: "priority",
        });
      } else if (rule && rule.conflict_rule === "stacking") {
        // Apply all offers (sequential)
        for (const offer of groupOffers) {
          resolved.push({
            ...offer,
            conflict_resolution: "stacking",
          });
        }
      } else {
        // best_discount - calculate which saves most money
        const best = this._selectBestDiscount(groupOffers);
        resolved.push({
          ...best,
          conflict_resolution: "best_discount",
        });
      }
    }

    return resolved;
  }

  /**
   * Get conflict resolution rule for two conflicting offers
   */
  static async _getConflictRule(offers) {
    if (offers.length < 2) return null;

    const rule = await OfferConflict.findOne({
      where: {
        [Op.or]: [
          {
            offer_id_1: offers[0].offer_id,
            offer_id_2: offers[1].offer_id,
          },
          {
            offer_id_1: offers[1].offer_id,
            offer_id_2: offers[0].offer_id,
          },
        ],
        is_active: 1,
      },
    });

    return rule;
  }

  /**
   * Select the offer that gives best discount
   */
  static _selectBestDiscount(offers) {
    return offers.reduce((best, current) => {
      const bestAmount = this._calculateDiscountAmount(best);
      const currentAmount = this._calculateDiscountAmount(current);
      return currentAmount > bestAmount ? current : best;
    });
  }

  /**
   * Calculate discount amount for an offer
   */
  static _calculateDiscountAmount(offerResult) {
    const base = offerResult.base_amount || 0;

    if (
      offerResult.offer_type === "flat" ||
      offerResult.discount_value_type === "flat"
    ) {
      return Math.min(parseFloat(offerResult.discount_value) || 0, base);
    } else if (
      offerResult.offer_type === "percent" ||
      offerResult.discount_value_type === "percent"
    ) {
      let amount = (base * (offerResult.discount_value || 0)) / 100;
      if (offerResult.max_discount_amount) {
        amount = Math.min(amount, offerResult.max_discount_amount);
      }
      return Math.min(amount, base);
    }

    return 0;
  }

  /**
   * Calculate actual discount amount with tax handling
   * @param {Object} offer - evaluated offer result
   * @param {Boolean} taxIncluded - is price tax-inclusive?
   * @returns {Object} - { discount_amount, tax_adjustment }
   */
  static calculateDiscountAmount(offer, taxIncluded = false) {
    let amount = this._calculateDiscountAmount(offer);

    // If discount applies before tax, no tax adjustment needed
    // If discount applies after tax, we might need to adjust tax
    if (offer.tax_handling === "after_discount" && taxIncluded) {
      // Complex: discount is on tax-inclusive amount
      // Keep as-is; let billing logic handle tax recalc
    }

    return {
      discount_amount: amount,
      tax_handling: offer.tax_handling || "before_discount",
    };
  }

  /**
   * Log offer application for audit trail
   */
  static async auditOfferApplication(
    store_id,
    sale_id,
    offer_id,
    product_id,
    base_amount,
    discount_amount,
    trigger_source = "auto",
    tax_handling = "before_discount",
  ) {
    try {
      await OfferAuditLog.create({
        store_id,
        sale_id,
        offer_id,
        product_id,
        base_amount,
        discount_amount,
        final_amount: base_amount - discount_amount,
        trigger_source,
        tax_applied_before: tax_handling === "before_discount" ? 1 : 0,
        is_refunded: 0,
      });
    } catch (error) {
      console.error("Error creating offer audit log:", error);
      // Don't throw - audit failure shouldn't block transaction
    }
  }

  /**
   * Reverse offer application on refund/return
   */
  static async reverseOfferApplication(
    offer_audit_id,
    refund_reason = "Customer return",
  ) {
    try {
      await OfferAuditLog.update(
        { is_refunded: 1, refund_reason },
        { where: { id: offer_audit_id } },
      );
    } catch (error) {
      console.error("Error reversing offer audit log:", error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  static async _isWithinUsageLimits(offer, customer_id, store_id) {
    if (offer.usage_limit && offer.usage_count >= offer.usage_limit) {
      return false;
    }

    if (offer.per_customer_limit && customer_id) {
      const customerSaleIds = await Sale.findAll({
        attributes: ["id"],
        where: { customer_id, store_id },
      });
      if (customerSaleIds.length > 0) {
        const saleIdList = customerSaleIds.map((s) => s.id);
        const usageCount = await OfferAuditLog.count({
          where: {
            offer_id: offer.id,
            is_refunded: 0,
            sale_id: { [Op.in]: saleIdList },
          },
        });
        if (usageCount >= offer.per_customer_limit) return false;
      }
    }

    return true;
  }

  static _getConflictGroup(discountType) {
    // Group offers that can't be combined
    // E.g., two "percent" offers on same product can't both apply
    switch (discountType) {
      case "flat":
      case "percent":
      case "min_qty":
      case "spend_get":
        return "item_discount";
      case "bogo":
        return "bogo";
      case "bundle":
        return "bundle";
      case "category":
        return "category";
      case "free_item":
        return "free_item";
      default:
        return "other";
    }
  }

  static _calculateCartTotal(cart) {
    return (cart.items || []).reduce(
      (sum, item) => sum + item.qty * item.unit_price,
      0,
    );
  }

  static _calculateCartItemCount(cart) {
    return (cart.items || []).reduce((sum, item) => sum + item.qty, 0);
  }

  static _calculateCategoryTotal(cart, category_id) {
    return (cart.items || [])
      .filter((i) => i.category_id === category_id)
      .reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  }
}

module.exports = OfferEngine;
