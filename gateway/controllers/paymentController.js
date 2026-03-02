/**
 * ==========================================
 * ROYAL CASINO - PAYMENT CONTROLLER
 * ==========================================
 * Handles USDT Deposits (IPN Webhooks) and Withdrawal requests.
 * Features: NOWPayments Stealth Mode, HMAC Security, Root Kill Switch,
 * and automatic network normalization for frontend inputs.
 */

const { verifyIPN, createPayment } = require('../services/nowpaymentsService');
const gatewayService = require('../services/gateway/gatewayService');
const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');
const { 
    USDT_NETWORKS, 
    ECONOMY_RULES, 
    calculateWithdrawalBreakdown, 
    normalizeNetwork 
} = require('../utils/cryptoConfig');

// Global state for the ROOT Kill Switch
const SYSTEM_FLAGS = {
    isWithdrawalSystemActive: true
};

/**
 * @route   POST /api/v1/payments/deposit
 * @desc    Generate a USDT deposit address for the user
 * @access  Private (Requires JWT)
 */
const requestDeposit = async (req, res, next) => {
    try {
        const { amountUsdt, network: rawNetwork } = req.body; 
        const userId = req.user.id;

        // -----------------------------
        // NEW: Internal Gateway (preferred)
        // If GATEWAY_MODE is set, we generate an invoice and return the deposit address.
        // This keeps the frontend contract stable while migrating away from NOWPayments.
        // -----------------------------
        if (process.env.GATEWAY_MODE) {
            const network = String(rawNetwork || '').trim().toUpperCase();
            const invoice = await gatewayService.createInvoice({
                userId,
                network,
                expectedAmountUsd: amountUsdt,
            });

            return res.status(200).json({
                success: true,
                message: 'Deposit invoice generated successfully (Gateway).',
                data: {
                    invoice_id: invoice.invoiceId,
                    pay_address: invoice.depositAddress,
                    pay_amount: invoice.expectedAmountUsd,
                    pay_currency: 'USDT',
                    network_name: invoice.network,
                    required_confirmations: invoice.requiredConfirmations,
                    mode: invoice.mode,
                }
            });
        }

        // 1. Normalize and Validate Network
        // Transforms frontend inputs like "TRC20" into strict API codes like "usdttrc20"
        const network = normalizeNetwork(rawNetwork);

        if (!network || !USDT_NETWORKS[network]) {
            return res.status(400).json({ success: false, message: 'Unsupported USDT network.' });
        }

        // 2. Generate unique Order ID mapping to this user
        const orderId = `DEP-${userId}-${Date.now()}`;

        // 3. Call NOWPayments Service with STEALTH MODE parameters
        // We pass generic descriptions to avoid Casino/Gambling detection by NOWPayments
        const stealthDescription = 'Digital Premium Services Subscription';
        
        const paymentData = await createPayment(
            amountUsdt, 
            'usd', 
            network, 
            orderId, 
            stealthDescription // Passed to the service
        );

        // 4. Return the crypto address and amounts to the frontend
        res.status(200).json({
            success: true,
            message: 'Deposit address generated successfully.',
            data: {
                pay_address: paymentData.pay_address,
                pay_amount: paymentData.pay_amount,
                pay_currency: paymentData.pay_currency,
                network_name: USDT_NETWORKS[network].name,
                required_confirmations: USDT_NETWORKS[network].depositConfirmations,
                order_id: orderId
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Listen for NOWPayments IPN (Background process)
 * @access  Public (Secured by HMAC Signature)
 */
const handleIPN = async (req, res, next) => {
    try {
        const signature = req.headers['x-nowpayments-sig'];
        
        // 1. Verify this request actually came from NOWPayments
        if (!verifyIPN(signature, req.body)) {
            logger.error(`[SECURITY ALERT] Invalid IPN signature from IP: ${req.ip}`);
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        const { payment_status, order_id, actually_paid, pay_currency } = req.body;

        // NOWPayments sends 'finished' when it hits the blockchain confirmation thresholds
        if (payment_status === 'finished') {
            
            // Extract user ID from order_id (Format: DEP-userId-timestamp)
            const userId = order_id.split('-')[1];

            // Calculate Crowns to credit
            const crownsToCredit = actually_paid / ECONOMY_RULES.CROWN_TO_USD_RATE;

            // Update user balance in Supabase securely
            const { error } = await supabase.rpc('increment_balance', {
                user_id: userId,
                amount_to_add: crownsToCredit
            });

            if (error) {
                logger.error(`Failed to credit user ${userId} for order ${order_id}: ${error.message}`);
                // Return 500 so NOWPayments will retry the IPN later
                return res.status(500).send('Database Error'); 
            }

            logger.info(`💰 Deposit Success: User ${userId} credited with ${crownsToCredit} CROWN (Paid: ${actually_paid} ${pay_currency})`);
        }

        // Always return 200 OK so NOWPayments knows we received the webhook
        res.status(200).json({ success: true, message: 'IPN processed' });

    } catch (error) {
        logger.error(`IPN Webhook Error: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
};

/**
 * @route   POST /api/v1/payments/withdraw/calculate
 * @desc    Calculates Gross/Fee/Net for the frontend UI before requesting
 * @access  Private
 */
const calculateWithdrawal = (req, res) => {
    const { amountUsdt, amountCrown } = req.body;

    // 1. ROOT KILL SWITCH CHECK
    if (!SYSTEM_FLAGS.isWithdrawalSystemActive) {
        return res.status(403).json({
            success: false,
            message: 'Withdrawals are currently disabled by the administration.'
        });
    }

    // 2. NEW LOGIC: Verify Minimums (50 CROWN)
    if (amountCrown < ECONOMY_RULES.MIN_WITHDRAWAL_CROWN) {
        return res.status(400).json({
            success: false,
            message: `Minimum withdrawal is ${ECONOMY_RULES.MIN_WITHDRAWAL_CROWN} CROWN`
        });
    }

    // Optional safety check: Verify the math matches the exchange rate
    const expectedUsdt = amountCrown * ECONOMY_RULES.CROWN_TO_USD_RATE;
    if (Math.abs(expectedUsdt - amountUsdt) > 0.1) {
        return res.status(400).json({
            success: false,
            message: 'Currency exchange rate mismatch.'
        });
    }

    // 3. Get Breakdown
    const breakdown = calculateWithdrawalBreakdown(amountUsdt);

    res.status(200).json({
        success: true,
        data: breakdown
    });
};

module.exports = {
    requestDeposit,
    handleIPN,
    calculateWithdrawal,
    SYSTEM_FLAGS
};
