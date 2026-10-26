"use strict";

const { CustomerWishlist, Product } = require("../../database/index");

const getWishlist = async (req, res, next) => {
  try {
    const items = await CustomerWishlist.findAll({
      where: { customer_id: req.user.id },
      include: [{ model: Product, attributes: ["id", "name", "selling_price", "image_url", "tax_rate", "tax_included", "mrp"] }],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

const addToWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.body;
    const [item] = await CustomerWishlist.findOrCreate({
      where: { customer_id: req.user.id, product_id },
      defaults: { customer_id: req.user.id, product_id },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const removeWishlistItem = async (req, res, next) => {
  try {
    await CustomerWishlist.destroy({ where: { id: req.params.id, customer_id: req.user.id } });
    res.json({ success: true, message: "Item removed" });
  } catch (err) { next(err); }
};

const clearWishlist = async (req, res, next) => {
  try {
    await CustomerWishlist.destroy({ where: { customer_id: req.user.id } });
    res.json({ success: true, message: "Wishlist cleared" });
  } catch (err) { next(err); }
};

module.exports = { getWishlist, addToWishlist, removeWishlistItem, clearWishlist };
