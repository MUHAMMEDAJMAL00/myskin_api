const Joi = require("joi");

const setConfig = Joi.object({
  config_key: Joi.string().max(100).required(),
  config_value: Joi.string().allow("", null).required(),
  data_type: Joi.string()
    .valid("string", "number", "boolean", "json")
    .default("string"),
  description: Joi.string().allow("", null),
});

const bulkSetConfig = Joi.object({
  configs: Joi.array()
    .items(
      Joi.object({
        config_key: Joi.string().max(100).required(),
        config_value: Joi.string().allow("", null).required(),
        data_type: Joi.string()
          .valid("string", "number", "boolean", "json")
          .default("string"),
        description: Joi.string().allow("", null),
      }),
    )
    .min(1)
    .required(),
});

module.exports = { setConfig, bulkSetConfig };
