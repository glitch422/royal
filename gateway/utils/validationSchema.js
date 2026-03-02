/**
 * ==========================================
 * ROYAL CASINO - VALIDATION SCHEMAS
 * ==========================================
 * This file defines the rules for all incoming data.
 * It prevents "Garbage In, Garbage Out" scenarios.
 */

const Joi = require('joi');

/**
 * Common validators
 */

// Username rules:
// - 3..30 chars
// - allow letters, numbers, underscore, dot, dash
// - must start with a letter or number
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/;

// Password rules (basic strong policy):
// - 8..128 chars
// - at least 1 letter
// - at least 1 number
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

/**
 * Registration Validation Schema
 * Rules for creating a new account.
 *
 * Notes:
 * - Email: allow ALL TLDs (important for domains like .co.il etc.)
 * - Password validated AFTER RSA decrypt (done in routes)
 */
const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .pattern(USERNAME_REGEX)
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.empty': 'Username cannot be empty',
      'string.pattern.base': 'Username must be 3-30 chars and may include letters, numbers, dot, underscore, dash',
      'any.required': 'Username is a required field',
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2, tlds: { allow: false } })
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email cannot be empty',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is a required field',
    }),

  password: Joi.string()
    .trim()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password cannot be empty',
      'string.pattern.base': 'Password must be 8-128 chars and include at least 1 letter and 1 number',
      'any.required': 'Password is a required field',
    }),
}).required();

/**
 * Login Validation Schema
 * Rules for logging in.
 * Uses the same password policy as registration (letter + number).
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2, tlds: { allow: false } })
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email cannot be empty',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is a required field',
    }),

  password: Joi.string()
    .trim()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password cannot be empty',
      'string.pattern.base': 'Password must be 8-128 chars and include at least 1 letter and 1 number',
      'any.required': 'Password is a required field',
    }),
}).required();

module.exports = {
  registerSchema,
  loginSchema,
};
