/**
 * ==========================================
 * ROYAL CASINO - AUTH ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { decryptSensitiveData } = require('../middleware/securityMiddleware');

const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const { registerSchema, loginSchema } = require('../utils/validationSchema');

router.post(
  '/register',
  authLimiter,
  decryptSensitiveData(['password']),
  validateRequest(registerSchema),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  decryptSensitiveData(['password']),
  validateRequest(loginSchema),
  authController.login
);

module.exports = router;
