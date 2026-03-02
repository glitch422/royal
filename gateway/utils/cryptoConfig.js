/**
 * ==========================================
 * ROYAL CASINO - CRYPTO & ECONOMY RULES
 * ==========================================
 * Centralizes all business logic for USDT networks, 
 * confirmation thresholds, fees, limits, and Rake.
 * Includes network normalization for frontend flexibility.
 */

const USDT_NETWORKS = {
    'usdttrc20': { 
        name: 'TRC20', 
        depositConfirmations: 12, 
        withdrawConfirmations: 20 
    },
    'usdterc20': { 
        name: 'ERC20', 
        depositConfirmations: 6, 
        withdrawConfirmations: 12 
    },
    'usdtbep20': { 
        name: 'BEP20', 
        depositConfirmations: 12, 
        withdrawConfirmations: 15 
    },
    'usdtpolygon': { 
        name: 'Polygon', 
        depositConfirmations: 64, 
        withdrawConfirmations: 128 
    }
};

const ECONOMY_RULES = {
    CROWN_TO_USD_RATE: parseInt(process.env.CROWN_TO_USD_RATE) || 10, 
    WITHDRAWAL_FEE_PERCENT: 3, 
    MIN_WITHDRAWAL_USDT: 500,
    MIN_WITHDRAWAL_CROWN: 50,
    // The percentage the Casino takes from each winning pot
    POT_RAKE_PERCENTAGE: parseFloat(process.env.POT_RAKE_PERCENTAGE) || 5 
};

/**
 * Normalizes the network input from the frontend to match NOWPayments codes.
 * Allows the frontend to send user-friendly labels like "TRC20" instead of "usdttrc20".
 * @param {string} inputNetwork - The network string sent by the frontend
 * @returns {string} The normalized NOWPayments network code
 */
const normalizeNetwork = (inputNetwork) => {
    if (!inputNetwork || typeof inputNetwork !== 'string') return '';
    
    const cleanInput = inputNetwork.trim().toUpperCase();
    
    // Mapping user-friendly labels to strict NOWPayments codes
    const NETWORK_MAPPER = {
        'TRC20': 'usdttrc20',
        'ERC20': 'usdterc20',
        'BEP20': 'usdtbep20',
        'POLYGON': 'usdtpolygon',
        'MATIC': 'usdtpolygon' // Fallback for polygon
    };

    // If it's already a valid NOWPayments code (e.g., 'usdttrc20' sent in any case), return it lowercase
    const lowerInput = inputNetwork.trim().toLowerCase();
    if (USDT_NETWORKS[lowerInput]) {
        return lowerInput;
    }

    // Otherwise, translate using the mapper
    return NETWORK_MAPPER[cleanInput] || lowerInput;
};

/**
 * Calculates Gross, Fee, and Net for withdrawals.
 * @param {number} requestedUsdtAmount 
 * @returns {Object} Breakdown of the withdrawal amounts
 */
const calculateWithdrawalBreakdown = (requestedUsdtAmount) => {
    const fee = requestedUsdtAmount * (ECONOMY_RULES.WITHDRAWAL_FEE_PERCENT / 100);
    const net = requestedUsdtAmount - fee;
    
    return {
        gross: parseFloat(requestedUsdtAmount.toFixed(2)),
        fee: parseFloat(fee.toFixed(2)),
        net: parseFloat(net.toFixed(2))
    };
};

module.exports = {
    USDT_NETWORKS,
    ECONOMY_RULES,
    normalizeNetwork,
    calculateWithdrawalBreakdown
};
