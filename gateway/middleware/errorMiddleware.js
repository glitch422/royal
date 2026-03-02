/**
 * ==========================================
 * ROYAL CASINO - GLOBAL ERROR HANDLER
 * ==========================================
 * This middleware catches all errors thrown in the application,
 * logs them securely using Winston, and returns a standardized, 
 * secure JSON response to the client.
 */

const logger = require('../utils/logger'); // Importing our Winston logger

const errorHandler = (err, req, res, next) => {
    // 1. Determine the status code
    // If res.statusCode is 200 (default), but an error was thrown, default to 500.
    // Otherwise, use the error's specific status code or the response's current status.
    const statusCode = res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);
    
    // 2. Log the error for internal auditing (Saved to logs/error.log)
    // We log the IP, Method, URL, and the Error Stack trace for debugging.
    logger.error(`[${req.ip || 'Unknown IP'}] ${req.method} ${req.originalUrl || req.url} - Status: ${statusCode} - Message: ${err.message}`, {
        stack: err.stack
    });

    // 3. Standardized secure response format
    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: err.message || 'Internal Server Error',
        // Stack trace is only visible in development mode for security reasons
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
