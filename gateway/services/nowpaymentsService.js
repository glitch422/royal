/**
 * ==========================================
 * ROYAL CASINO - NOWPAYMENTS CRYPTO SERVICE
 * ==========================================
 * Handles all external communication with the NOWPayments API
 * for generating crypto deposit addresses and verifying IPNs.
 * Features: Stealth Mode integration to mask casino operations.
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

const API_URL = 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

/**
 * Creates a new crypto payment request
 * @param {number} priceAmount - The amount in fiat (e.g., USD)
 * @param {string} priceCurrency - The fiat currency (default 'usd')
 * @param {string} payCurrency - The crypto coin the user wants to pay with (e.g., 'btc', 'usdttrc20')
 * @param {string} orderId - Your internal unique order ID for tracking
 * @param {string} description - Stealth description to mask the casino nature (e.g., 'Digital Premium Services')
 * @returns {Object} The payment details from NOWPayments (including the crypto address)
 */
const createPayment = async (priceAmount, priceCurrency = 'usd', payCurrency, orderId, description) => {
    try {
        const response = await axios.post(`${API_URL}/payment`, {
            price_amount: priceAmount,
            price_currency: priceCurrency,
            pay_currency: payCurrency,
            order_id: orderId,
            order_description: description,
            ipn_callback_url: `${process.env.PRODUCTION_URL}/api/v1/payments/webhook`,
            success_url: `${process.env.FRONTEND_URL}/dashboard?status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard?status=cancelled`
        }, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Successfully created NOWPayments invoice for Order ID: ${orderId}`);
        return response.data;
    } catch (error) {
        logger.error(`NOWPayments Create Payment Error: ${error.response?.data?.message || error.message}`);
        throw new Error('Failed to create crypto payment gateway');
    }
};

/**
 * Verifies the integrity of an incoming IPN (Webhook) from NOWPayments
 * using HMAC SHA-512 and your IPN Secret.
 * @param {string} signature - The 'x-nowpayments-sig' header
 * @param {Object} body - The raw request body
 * @returns {boolean} True if the signature is valid, false otherwise
 */
const verifyIPN = (signature, body) => {
    if (!signature || !body) return false;

    // Sort the body keys alphabetically as required by NOWPayments documentation
    const sortedKeys = Object.keys(body).sort();
    const sortedBody = {};
    for (const key of sortedKeys) {
        sortedBody[key] = body[key];
    }

    // Convert the sorted body to a JSON string
    const stringifiedBody = JSON.stringify(sortedBody);

    // Create the HMAC SHA-512 hash
    const hmac = crypto.createHmac('sha512', IPN_SECRET);
    hmac.update(stringifiedBody);
    const calculatedSignature = hmac.digest('hex');

    // Compare the signatures
    return calculatedSignature === signature;
};

module.exports = {
    createPayment,
    verifyIPN
};
