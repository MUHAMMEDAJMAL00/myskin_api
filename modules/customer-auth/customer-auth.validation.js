const Joi = require("joi");

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(150).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  password: Joi.string().min(6).max(128).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  confirm_password: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
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
  new_password: Joi.string().min(6).max(128).required().messages({
    "string.empty": "New password is required",
    "string.min": "New password must be at least 6 characters",
    "any.required": "New password is required",
  }),
  confirm_password: Joi.string().valid(Joi.ref("new_password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your new password",
  }),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional()
    .allow(""),
  address: Joi.string().max(500).optional().allow(""),
  city: Joi.string().max(100).optional().allow(""),
  state: Joi.string().max(100).optional().allow(""),
  country: Joi.string().max(100).optional().allow(""),
  postal_code: Joi.string().max(20).optional().allow(""),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

module.exports = { signupSchema, loginSchema, changePasswordSchema, updateProfileSchema };
