/**
 * ==========================================
 * ROYAL CASINO - PROVABLY FAIR VERIFIER
 * ==========================================
 */

const { getShuffledDeck } = require('../utils/provablyFair');

/**
 * @route   POST /api/v1/fairness/verify
 * @desc    Verify a past hand's deck using seeds
 * @access  Public
 */
const verifyHand = (req, res) => {
    try {
        const { serverSeed, clientSeed, handId } = req.body;

        if (!serverSeed || !clientSeed || !handId) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: serverSeed, clientSeed, and handId are required." 
            });
        }

        // Re-generate the deck using the exact same logic the engine used
        const verifiedDeck = getShuffledDeck(serverSeed, clientSeed, handId);

        res.status(200).json({
            success: true,
            message: "Deck verified successfully.",
            data: {
                handId,
                deck: verifiedDeck
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { verifyHand };
