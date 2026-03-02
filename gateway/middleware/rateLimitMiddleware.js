/**
 * ==========================================
 * ROYAL CASINO - RATE LIMITER MIDDLEWARE
 * ==========================================
 * Prevents brute-force and DoS attacks by limiting requests per IP.
 *
 * Notes:
 * - If you're behind Cloudflare / Nginx, make sure in server.js you have:
 *   app.set('trust proxy', 1);
 * - If you want the NOWPayments webhook NOT to be blocked by the GLOBAL limiter,
 *   either exempt it in server.js OR apply globalLimiter after defining the webhook route.
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Helpers to read env safely
const toInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Shared handler for consistent JSON + logging
const buildHandler = (tag) => {
  return (req, res, _next, options) => {
    const ip = req.ip;
    const path = req.originalUrl || req.url;
    const method = req.method;

    logger.warn(`[RATE_LIMIT:${tag}] Blocked request from IP: ${ip} | ${method} ${path}`);

    const payload =
      typeof options.message === 'object'
        ? options.message
        : {
            success: false,
            status: options.statusCode,
            message: options.message || 'Too many requests, please try again later.',
          };

    return res.status(options.statusCode).json(payload);
  };
};

/**
 * Global Rate Limiter:
 * Applied to all API routes to protect server resources.
 */
const globalLimiter = rateLimit({
  windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  max: toInt(process.env.RATE_LIMIT_MAX, 100), // 100 requests per window per IP
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  handler: buildHandler('GLOBAL'),
});

/**
 * Strict Limiter:
 * Higher protection for sensitive routes like Login or Register.
 */
const authLimiter = rateLimit({
  windowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000), // 1 hour
  max: toInt(process.env.AUTH_RATE_LIMIT_MAX, 10), // 10 attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many authentication attempts. Please try again in an hour.',
  },
  handler: buildHandler('AUTH'),
});

/**
 * Webhook Limiter:
 * Designed for payment providers (NOWPayments) which may send bursts / retries.
 * Keep it higher than global limiter, and configurable via ENV.
 */
const webhookLimiter = rateLimit({
  windowMs: toInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000), // 5 minutes
  max: toInt(process.env.WEBHOOK_RATE_LIMIT_MAX, 300), // 300 per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many webhook requests. Please try again later.',
  },
  handler: buildHandler('WEBHOOK'),
});

module.exports = {
  globalLimiter,
  authLimiter,
  webhookLimiter,
};
