/**
 * ==========================================
 * ROYAL CASINO - AUDIT LOGGING SYSTEM
 * ==========================================
 * Logs all security events and errors to physical files.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  // If we can't create logs dir, fall back to console only (avoid crashing)
  // eslint-disable-next-line no-console
  console.error('Failed to create logs directory:', err);
}

const isProduction = process.env.NODE_ENV === 'production';

// Common formats
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true })
);

// Production: JSON logs (best for aggregators)
const productionFormat = winston.format.combine(baseFormat, winston.format.json());

// Development: readable logs
const devConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;

    const metaString =
      meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    if (stack) {
      return `${timestamp} ${level}: ${message}\n${stack}${metaString}`;
    }

    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// File transports
const errorFileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'error.log'),
  level: 'error',
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  tailable: true,
});

const combinedFileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'combined.log'),
  level: 'info',
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  tailable: true,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction ? productionFormat : productionFormat, // keep JSON in files in all envs
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'royal-backend',
    env: process.env.NODE_ENV || 'development',
  },
  transports: [errorFileTransport, combinedFileTransport],
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

// Console transport for development
if (!isProduction) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        devConsoleFormat
      ),
    })
  );
}

module.exports = logger;
