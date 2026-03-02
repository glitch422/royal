/**
 * ==========================================
 * ROYAL CASINO - VALIDATION MIDDLEWARE
 * ==========================================
 * Joi validation middleware for request bodies
 */

const validateRequest = (schema, options = {}) => {
  return (req, res, next) => {
    try {
      if (!schema || typeof schema.validate !== 'function') {
        return res.status(500).json({
          success: false,
          status: 500,
          message: 'Validation schema is missing or invalid',
        });
      }

      const validationOptions = {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false,
        ...options,
      };

      const { error, value } = schema.validate(req.body, validationOptions);

      if (error) {
        const errors = error.details.map((detail) => ({
          field: Array.isArray(detail.path) ? detail.path.join('.') : String(detail.path || ''),
          message: detail.message,
          type: detail.type,
        }));

        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Validation failed',
          errors,
        });
      }

      // Put the sanitized, validated body back on req.body
      req.body = value;

      return next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Validation middleware error',
      });
    }
  };
};

module.exports = { validateRequest };
