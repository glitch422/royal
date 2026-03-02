/**
 * ==========================================
 * ROYAL CASINO - PAYMENT ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const { protectRoute } = require('../utils/jwtSecurity');

/**
 * Optional: Webhook rate limiter
 * Recommended so NOWPayments retries / bursts won't get blocked by global limiter.
 * This will gracefully fall back to "no limiter" if webhookLimiter is not defined yet.
 */
let webhookLimiter = (req, res, next) => next();

try {
  const rateLimits = require('../middleware/rateLimitMiddleware');
  if (rateLimits && typeof rateLimits.webhookLimiter === 'function') {
    webhookLimiter = rateLimits.webhookLimiter;
  }
} catch (e) {
  // If middleware file doesn't export webhookLimiter yet, keep fallback middleware
}

// 1. Request a new USDT deposit address (Requires Login)
router.post('/deposit', protectRoute, paymentController.requestDeposit);

// 2. Withdrawal Calculation UI endpoint (Requires Login)
router.post('/withdraw/calculate', protectRoute, paymentController.calculateWithdrawal);

// 3. NOWPayments Webhook IPN (Must be public, secured by HMAC inside the controller)
// Apply a dedicated limiter (high threshold) if available
router.post('/webhook', webhookLimiter, paymentController.handleIPN);

module.exports = router;
