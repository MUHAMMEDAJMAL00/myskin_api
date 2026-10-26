"use strict";

const AppError = require("../utils/AppError");

/**
 * Validate req.body against a Joi schema.
 * Usage in routes: router.post("/", validate(schema.createUser), controller.createUser)
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: true, // stop at first error
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  req.body = value; // use sanitized/defaulted values
  next();
};

module.exports = validate;
