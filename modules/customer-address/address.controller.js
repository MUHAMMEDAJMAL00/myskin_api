"use strict";

const { CustomerAddress, Customer } = require("../../database/index");

const getAddresses = async (req, res, next) => {
  try {
    const addresses = await CustomerAddress.findAll({
      where: { customer_id: req.user.id },
      order: [["is_default", "DESC"], ["created_at", "DESC"]],
    });
    res.json({ success: true, data: addresses });
  } catch (err) { next(err); }
};

const addAddress = async (req, res, next) => {
  try {
    // Ensure customer record exists (in case DB was reset after signup)
    const [customer] = await Customer.findOrCreate({
      where: { id: req.user.id },
      defaults: {
        id: req.user.id,
        store_id: 1,
        name: req.body.name || "Customer",
        email: req.body.email || null,
        phone: req.body.phone || null,
        is_active: 1,
      },
    });

    const data = {
      customer_id: customer.id,
      name: req.body.name || customer.name,
      phone: req.body.phone || customer.phone,
      address_type: req.body.address_type || "Home",
      full_address: req.body.full_address || "",
      street: req.body.street || "",
      city: req.body.city || "",
      state: req.body.state || "",
      country: req.body.country || "India",
      postal_code: req.body.postal_code || "",
      is_default: req.body.is_default || 0,
    };
    const address = await CustomerAddress.create(data);
    res.status(201).json({ success: true, data: address });
  } catch (err) { next(err); }
};

const updateAddress = async (req, res, next) => {
  try {
    const address = await CustomerAddress.findOne({ where: { id: req.params.id, customer_id: req.user.id } });
    if (!address) return res.status(404).json({ success: false, message: "Address not found" });
    await address.update(req.body);
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
};

const deleteAddress = async (req, res, next) => {
  try {
    await CustomerAddress.destroy({ where: { id: req.params.id, customer_id: req.user.id } });
    res.json({ success: true, message: "Address deleted" });
  } catch (err) { next(err); }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress };
