/**
 * ==========================================
 * ROYAL CASINO - SECURITY MIDDLEWARE
 * ==========================================
 * This middleware handles automatic RSA decryption 
 * for incoming sensitive data.
 */

const cryptoUtils = require('../utils/cryptoUtils');

/**
 * Decrypts RSA-encrypted fields in the request body.
 * Expects the encrypted data to be in Base64 format.
 * * @param {Array} fields - List of fields to attempt decryption on.
 */
const decryptSensitiveData = (fields = []) => {
    return (req, res, next) => {
        // If there's no body, move to the next middleware
        if (!req.body) return next();

        try {
            fields.forEach(field => {
                if (req.body[field]) {
                    // Attempt to decrypt the specific field using our RSA Private Key
                    const decryptedValue = cryptoUtils.decryptRSA(req.body[field]);
                    
                    if (decryptedValue) {
                        // Replace the encrypted string with the cleartext for the controller to use
                        req.body[field] = decryptedValue;
                    }
                }
            });
            next();
        } catch (error) {
            console.error('⚠️ Security Middleware - Decryption Error:', error.message);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid encrypted data provided.' 
            });
        }
    };
};

module.exports = {
    decryptSensitiveData
};
