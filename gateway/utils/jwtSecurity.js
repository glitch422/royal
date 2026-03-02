/**
 * ==========================================
 * ROYAL CASINO - JWT & COOKIE SECURITY
 * ==========================================
 * Central authentication security utilities:
 * 1. JWT Generation
 * 2. Secure HttpOnly Cookie Attachment
 * 3. CSRF Mitigation (SameSite)
 * 4. Route Protection Middleware
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

const COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'jwt';

// Helpers
const mustGetEnv = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const getCookieMaxAgeMs = () => {
  // Keep cookie life configurable and aligned with JWT expiration as much as possible
  // Default: 24 hours
  const hoursRaw = process.env.JWT_COOKIE_EXPIRES_IN_HOURS;
  const hours = Number(hoursRaw);
  if (Number.isFinite(hours) && hours > 0) return hours * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
};

const getSameSiteValue = () => {
  // IMPORTANT:
  // - If frontend and backend are on different "sites" and you use cookies for auth,
  //   you will likely need SameSite=None AND Secure=true.
  // - Defaulting to 'lax' is safer for many setups but may block cross-site XHR cookies.
  const fromEnv = (process.env.COOKIE_SAMESITE || '').toLowerCase().trim();

  if (fromEnv === 'strict') return 'strict';
  if (fromEnv === 'lax') return 'lax';
  if (fromEnv === 'none') return 'none';

  // Default behavior
  return process.env.NODE_ENV === 'production' ? 'lax' : 'lax';
};

const getCookieOptions = () => {
  const sameSite = getSameSiteValue();

  // If SameSite=None, Secure MUST be true in modern browsers.
  const secure =
    process.env.COOKIE_SECURE === 'true'
      ? true
      : sameSite === 'none'
        ? true
        : process.env.NODE_ENV === 'production';

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: getCookieMaxAgeMs(),
  };

  // Optional: set cookie domain explicitly (useful for subdomains)
  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

// 1. Generate JWT Token
// Optional third param: username (to support socket usage expecting it)
const signToken = (id, role, username) => {
  const secret = mustGetEnv('JWT_SECRET');

  const payload = { id, role };
  if (username) payload.username = username;

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  };

  // Optional hardening (only if you set these env vars)
  if (process.env.JWT_ISSUER) options.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) options.audience = process.env.JWT_AUDIENCE;

  return jwt.sign(payload, secret, options);
};

// 2. Attach Token to Secure HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  if (!user || !user.id || !user.role) {
    return res.status(500).json({
      success: false,
      message: 'Auth error: user object is missing required fields (id/role).',
    });
  }

  const token = signToken(user.id, user.role, user.username);

  const cookieOptions = getCookieOptions();

  // Do NOT mutate the original user object
  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.passwordHash;
  delete safeUser.hashedPassword;

  return res
    .status(statusCode)
    .cookie(COOKIE_NAME, token, cookieOptions)
    .json({
      success: true,
      status: statusCode,
      message,
      data: { user: safeUser },
    });
};

// 3. Middleware to Protect Routes (Verify Cookie OR Bearer Token)
const protectRoute = async (req, res, next) => {
  try {
    let token;

    // Priority 1: HttpOnly cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }

    // Priority 2: Authorization header (Bearer)
    if (!token && req.headers && req.headers.authorization) {
      const auth = req.headers.authorization;
      if (auth.startsWith('Bearer ')) {
        token = auth.slice(7).trim();
      }
    }

    if (!token) {
      logger.warn(`[${req.ip}] Unauthorized access attempt: No token provided.`);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please log in.',
      });
    }

    const secret = mustGetEnv('JWT_SECRET');

    const verifyOptions = {};
    if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER;
    if (process.env.JWT_AUDIENCE) verifyOptions.audience = process.env.JWT_AUDIENCE;

    const decoded = jwt.verify(token, secret, verifyOptions);

    // Attach decoded user info to request
    req.user = decoded;

    return next();
  } catch (error) {
    logger.error(`[${req.ip}] Token validation failed: ${error.message}`, { stack: error.stack });
    return res.status(401).json({
      success: false,
      message: 'Session is invalid or has expired. Please log in again.',
    });
  }
};

// Optional: Role based access control
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Missing user role.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.',
      });
    }

    return next();
  };
};

// 4. Logout User (Clear the Cookie)
const logoutUser = (res) => {
  const cookieOptions = getCookieOptions();

  // Clear cookie reliably: same options + maxAge 0
  return res
    .cookie(COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 })
    .status(200)
    .json({
      success: true,
      message: 'User logged out successfully',
    });
};

module.exports = {
  signToken,
  sendTokenResponse,
  protectRoute,
  restrictTo,
  logoutUser,
};
