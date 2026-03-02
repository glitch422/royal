/**
 * ==========================================
 * ROYAL - MAIN SERVER ENTRY POINT
 * ==========================================
 * - Express 5
 * - Security middlewares
 * - Auth / Admin / Payments / Fairness / (optional Gateway)
 * - System status endpoints:
 *   - Public: GET /api/v1/system/status
 *   - Admin/Root: GET /api/v1/admin/system/status (protected)
 */

const path = require("path");

// Load env (supports DOTENV_PATH override)
const dotenvPath = process.env.DOTENV_PATH
  ? path.resolve(process.env.DOTENV_PATH)
  : path.resolve(process.cwd(), ".env");
require("dotenv").config({ path: dotenvPath });

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const xss = require("xss");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const logger = require("./utils/logger");
const { initSockets } = require("./sockets/index");

const { globalLimiter } = require("./middleware/rateLimitMiddleware");
const errorHandler = require("./middleware/errorMiddleware");

// Auth middleware
const { protectRoute } = require("./utils/jwtSecurity");

// Supabase client (service role)
const supabase = require("./config/supabaseClient");

// Routes (existing)
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const fairnessRoutes = require("./routes/fairnessRoutes");
const systemRoutes = require("./routes/systemRoutes");

// Optional: Gateway routes (if exists in your project)
let gatewayRoutes = null;
try {
  gatewayRoutes = require("./routes/gatewayRoutes");
} catch (e) {
  // Not fatal if gatewayRoutes is not part of this repo snapshot
  gatewayRoutes = null;
}

// Optional: in-memory kill switch from paymentController (legacy)
let SYSTEM_FLAGS = null;
try {
  // eslint-disable-next-line global-require
  SYSTEM_FLAGS = require("./controllers/paymentController").SYSTEM_FLAGS;
} catch (e) {
  SYSTEM_FLAGS = null;
}

const app = express();
app.disable("x-powered-by");

// If you're behind Cloudflare / Nginx / Load Balancer
app.set("trust proxy", 1);

// Wrap Express app in raw HTTP server so Socket.io can attach to it
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";

// =========================
// REQUEST ID (trace)
// =========================
app.use((req, res, next) => {
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
});

// =========================
// GLOBAL SECURITY MIDDLEWARE
// =========================
app.use(helmet());

// IMPORTANT: parse body before sanitizing
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

app.use(hpp());
app.use(cookieParser());

// =========================
// XSS SANITIZATION (Express 5 compatible)
// =========================
const sanitizeValue = (val) => {
  if (typeof val === "string") return xss(val);
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === "object") {
    for (const key of Object.keys(val)) {
      val[key] = sanitizeValue(val[key]);
    }
    return val;
  }
  return val;
};

app.use((req, res, next) => {
  if (req.body) sanitizeValue(req.body);
  if (req.query) sanitizeValue(req.query); // Express 5: do not assign req.query
  if (req.params) sanitizeValue(req.params);
  next();
});

// =========================
// CORS
// =========================
const allowedOrigins = (
  NODE_ENV === "production"
    ? [process.env.PRODUCTION_URL, process.env.PRODUCTION_WWW_URL]
    : [process.env.FRONTEND_URL, "http://localhost:5173"]
).filter(Boolean);

const normalizeOrigin = (origin) => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
};

const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);

    if (normalizedAllowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    logger.warn(`CORS Blocked access from origin: ${origin}`, { requestId: origin });
    return callback(new Error("Not allowed by CORS security policy"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// =========================
// RATE LIMITING
// =========================
app.use("/api/", (req, res, next) => {
  const url = req.originalUrl || "";

  // keep webhook + health/status outside limiter so you can always see status during incidents
  if (url.startsWith("/api/v1/payments/webhook")) return next();
  if (url.startsWith("/api/health")) return next();
  if (url.startsWith("/api/v1/system/status")) return next();
  if (url.startsWith("/api/v1/admin/system/status")) return next();

  return globalLimiter(req, res, next);
});

// =========================
// SYSTEM STATUS HELPERS
// =========================
function parseBool(v, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
}

function nowIso() {
  return new Date().toISOString();
}

async function computeSystemHealth() {
  // how “fresh” heartbeat must be
  const maxAgeSec = Number(process.env.HEARTBEAT_MAX_AGE_SEC || 180);

  // which components are required to consider the system healthy
  // you can expand later: "api,gateway_worker_erc20,gateway_worker_trc20"
  const required = String(process.env.HEALTH_REQUIRED_COMPONENTS || "api")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from("system_heartbeats")
    .select("component,status,last_seen_at,last_error,meta,updated_at")
    .in("component", required);

  if (error) {
    return {
      ok: false,
      reason: "DB_ERROR",
      asOf: nowIso(),
      required,
      components: [],
      maxAgeSec,
      dbError: error.message,
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const byComponent = new Map(rows.map((r) => [r.component, r]));

  const components = required.map((name) => {
    const row = byComponent.get(name);
    if (!row) {
      return {
        component: name,
        present: false,
        status: "MISSING",
        ageSec: null,
        lastSeenAt: null,
        lastError: null,
      };
    }

    const last = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    const ageSec = last ? Math.floor((Date.now() - last) / 1000) : null;

    const ok = row.status === "OK" && ageSec !== null && ageSec <= maxAgeSec;

    return {
      component: name,
      present: true,
      status: row.status,
      ageSec,
      lastSeenAt: row.last_seen_at,
      lastError: row.last_error,
      ok,
      meta: row.meta || null,
    };
  });

  const ok = components.every((c) => c.ok === true);

  return {
    ok,
    reason: ok ? "OK" : "STALE_OR_DOWN",
    asOf: nowIso(),
    required,
    components,
    maxAgeSec,
  };
}

// =========================
// API SELF HEARTBEAT WRITER
// =========================
// This prevents /api/v1/system/status from staying "unhealthy" if you forgot to run the standalone heartbeat job.
function startApiHeartbeatWriter() {
  const enabled = String(process.env.API_HEARTBEAT_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) return;

  const intervalSec = Number(process.env.API_HEARTBEAT_INTERVAL_SEC || 30);
  const component = String(process.env.API_HEARTBEAT_COMPONENT || 'api');

  const tick = async () => {
    try {
      await supabase
        .from('system_heartbeats')
        .upsert({
          component,
          status: 'OK',
          last_seen_at: new Date().toISOString(),
          meta: { via: 'server', pid: process.pid, env: NODE_ENV },
        }, { onConflict: 'component' });
    } catch (e) {
      // Do not crash server for heartbeat issues
      logger.error(`API heartbeat writer error: ${e.message || e}`);
    }
  };

  tick();
  setInterval(tick, Math.max(5, intervalSec) * 1000).unref();
}

// =========================
// SYSTEM STATUS ROUTES
// =========================

// Public - Player endpoint
app.get("/api/v1/system/status", async (req, res, next) => {
  try {
    const health = await computeSystemHealth();

    const creditsEnabled = parseBool(process.env.CREDITS_ENABLED, true);
    const withdrawalsFlagEnv = parseBool(process.env.WITHDRAWALS_ACTIVE, true);

    const withdrawalsKillSwitch =
      SYSTEM_FLAGS && typeof SYSTEM_FLAGS.isWithdrawalSystemActive === "boolean"
        ? SYSTEM_FLAGS.isWithdrawalSystemActive
        : true;

    const systemOnline = health.ok === true;

    const depositsEnabled = systemOnline && creditsEnabled;
    const withdrawalsEnabled = systemOnline && withdrawalsFlagEnv && withdrawalsKillSwitch;

    const banner =
      systemOnline
        ? null
        : {
            level: "error",
            title: "System temporarily unavailable",
            message:
              "We are experiencing a temporary internal issue. Deposits and withdrawals are disabled until it is resolved.",
          };

    return res.status(200).json({
      success: true,
      asOf: health.asOf,
      healthy: systemOnline,
      depositsEnabled,
      withdrawalsEnabled,
      withdrawalsActive: withdrawalsEnabled,
      banner,
    });
  } catch (err) {
    return next(err);
  }
});

// Protected - Admin/Root endpoint
app.get("/api/v1/admin/system/status", protectRoute, async (req, res, next) => {
  try {
    // Role gate: admin or root only
    const role = req.user?.role;
    if (!["admin", "root"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin/Root access required.",
      });
    }

    const health = await computeSystemHealth();

    const creditsEnabled = parseBool(process.env.CREDITS_ENABLED, true);
    const withdrawalsFlagEnv = parseBool(process.env.WITHDRAWALS_ACTIVE, true);

    const withdrawalsKillSwitch =
      SYSTEM_FLAGS && typeof SYSTEM_FLAGS.isWithdrawalSystemActive === "boolean"
        ? SYSTEM_FLAGS.isWithdrawalSystemActive
        : true;

    const systemOnline = health.ok === true;

    const depositsEnabled = systemOnline && creditsEnabled;
    const withdrawalsEnabled = systemOnline && withdrawalsFlagEnv && withdrawalsKillSwitch;

    return res.status(200).json({
      success: true,
      asOf: health.asOf,
      healthy: systemOnline,
      depositsEnabled,
      withdrawalsEnabled,
      withdrawalsActive: withdrawalsEnabled,
      flags: {
        CREDITS_ENABLED: creditsEnabled,
        WITHDRAWALS_ACTIVE: withdrawalsFlagEnv,
        withdrawalKillSwitch: withdrawalsKillSwitch,
      },
      heartbeat: health,
    });
  } catch (err) {
    return next(err);
  }
});

// Simple health check (no DB logic)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "online",
    timestamp: nowIso(),
    env: NODE_ENV,
  });
});

// =========================
// API ROUTES
// =========================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/fairness", fairnessRoutes);
app.use("/api/v1/system", systemRoutes);

// Optional gateway mount (if you have it)
if (gatewayRoutes) {
  app.use("/api/v1/gateway", gatewayRoutes);
  logger.info("✅ Gateway routes mounted at /api/v1/gateway");
} else {
  logger.warn("ℹ️ gatewayRoutes not found - /api/v1/gateway not mounted (this is OK if your repo snapshot doesn't include it).");
}

// =========================
// 404 HANDLER
// =========================
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// =========================
// ERROR HANDLER
// =========================
app.use(errorHandler);

// =========================
// PROCESS LEVEL HANDLERS
// =========================
process.on("uncaughtException", (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

// Graceful shutdown
const shutdown = (signal) => {
  try {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000).unref();
  } catch (e) {
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// =========================
// INITIALIZE WEBSOCKETS
// =========================
initSockets(server);

// =========================
// SERVER START
// =========================
server.listen(PORT, () => {
  logger.info("=============================================");
  logger.info("🚀 ROYAL BACKEND IS LIVE!");
  logger.info(`📡 HTTP & WebSockets Listening on: http://localhost:${PORT}`);
  logger.info("🛡️  Security: Helmet, HPP, HttpOnly Cookies, Joi Validation");
  logger.info(`🌍 Mode: ${String(NODE_ENV).toUpperCase()}`);
  logger.info(`🧾 Env loaded from: ${dotenvPath}`);
  logger.info("=============================================");

  // Start heartbeat writer after server is up
  startApiHeartbeatWriter();
});
