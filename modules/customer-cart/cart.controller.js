"use strict";

const { CustomerCart, Product } = require("../../database/index");

const getCart = async (req, res, next) => {
  try {
    const items = await CustomerCart.findAll({
      where: { customer_id: req.user.id },
      include: [{ model: Product, attributes: ["id", "name", "selling_price", "image_url", "tax_rate", "tax_included", "mrp"] }],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

const addToCart = async (req, res, next) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    const [item, created] = await CustomerCart.findOrCreate({
      where: { customer_id: req.user.id, product_id, variant_id: variant_id || null },
      defaults: { customer_id: req.user.id, product_id, variant_id: variant_id || null, quantity },
    });
    if (!created) {
      item.quantity = parseFloat(item.quantity) + parseFloat(quantity);
      await item.save();
    }
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const updateCartItem = async (req, res, next) => {
  try {
    const item = await CustomerCart.findOne({ where: { id: req.params.id, customer_id: req.user.id } });
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    item.quantity = req.body.quantity;
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

const removeCartItem = async (req, res, next) => {
  try {
    await CustomerCart.destroy({ where: { id: req.params.id, customer_id: req.user.id } });
    res.json({ success: true, message: "Item removed" });
  } catch (err) { next(err); }
};

const clearCart = async (req, res, next) => {
  try {
    await CustomerCart.destroy({ where: { customer_id: req.user.id } });
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
