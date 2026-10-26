const Joi = require("joi");

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 3 characters",
    "any.required": "Username is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(6).required().messages({
    "string.empty": "Current password is required",
    "any.required": "Current password is required",
  }),
  new_password: Joi.string().min(6).required().messages({
    "string.empty": "New password is required",
    "string.min": "New password must be at least 6 characters",
    "any.required": "New password is required",
  }),
  confirm_password: Joi.string()
    .valid(Joi.ref("new_password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

module.exports = { loginSchema, changePasswordSchema };
