const centrixService = require("../../services/centrix.service");
const salesService = require("../sales/sales.service");
const { Customer } = require("../../database/index");
const { sendMessageSchema, sendInvoiceSchema } = require("./centrix.validation");

const sendMessage = async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await centrixService.sendMessage(value);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const sendInvoice = async (req, res, next) => {
  try {
    const { error, value } = sendInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const sale = await salesService.getSaleById(value.saleId, null, req.storeId);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    let customer = {};
    if (sale.customer_id) {
      const found = await Customer.findByPk(sale.customer_id, {
        attributes: ["id", "name", "phone", "email"],
      });
      if (found) customer = { name: found.name, phone: found.phone, email: found.email };
    }

    const saleWithCustomer = { ...sale, customer };

    const result = await centrixService.sendInvoice(saleWithCustomer, value.channel);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const sendBulkMessage = async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await centrixService.sendMessage(value);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getTokenStatus = async (req, res, next) => {
  try {
    const token = await centrixService.getAccessToken();
    res.json({ success: true, data: { hasToken: !!token } });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage, sendInvoice, sendBulkMessage, getTokenStatus };
