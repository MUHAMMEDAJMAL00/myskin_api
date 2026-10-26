const Joi = require("joi");

const sendMessageSchema = Joi.object({
  channel: Joi.string().valid("whatsapp", "email", "sms").required(),
  recipients: Joi.array().items(Joi.object({
    name: Joi.string().allow("").optional(),
    mobileNo: Joi.string().allow("").optional(),
    email: Joi.string().allow("").optional(),
  })).optional(),
  content: Joi.string().min(1).max(5000).required(),
  scheduledAt: Joi.date().iso().optional().allow(null),
  title: Joi.string().max(255).optional(),
  subject: Joi.string().max(255).optional(),
});

const sendInvoiceSchema = Joi.object({
  channel: Joi.string().valid("whatsapp", "email", "sms").required(),
  saleId: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
});

module.exports = { sendMessageSchema, sendInvoiceSchema };
