/**
 * ==========================================
 * ROYAL CASINO - PROVABLY FAIR ENGINE (POKER)
 * ==========================================
 * Cryptographic Random Number Generator (RNG) optimized 
 * specifically for Texas Hold'em card shuffling.
 * Ensures absolute transparency and fairness.
 */

const crypto = require('crypto');

/**
 * 1. Generate a new Server Seed and its SHA-256 Hash.
 * The server stores the 'seed', but shows the 'hash' to the players at the table BEFORE the hand starts.
 * @returns {Object} { serverSeed, serverSeedHash }
 */
const generateServerSeed = () => {
    // Generate a strong random 64-character hex string
    const serverSeed = crypto.randomBytes(32).toString('hex');
    // Hash it using SHA-256
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    
    return { serverSeed, serverSeedHash };
};

/**
 * 2. Generate a default Client Seed.
 * In a multiplayer poker game, this is usually a combination of the seeds 
 * provided by all active players at the table, ensuring everyone influenced the shuffle.
 * @returns {string} 32-character random string
 */
const generateClientSeed = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * 3. Calculate the Game Result (The Core Algorithm)
 * Combines the Server Seed, Client Seed(s), and Nonce using HMAC-SHA256.
 * @param {string} serverSeed - The unhashed server secret
 * @param {string} clientSeed - The combined player seeds
 * @param {string} nonce - The specific action identifier (e.g., 'hand-1234-shuffle-51')
 * @returns {number} A float between 0 and 1
 */
const calculateFloatResult = (serverSeed, clientSeed, nonce) => {
    const message = `${clientSeed}-${nonce}`;

    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(message);
    const hexResult = hmac.digest('hex');

    const partialHex = hexResult.substring(0, 8);
    const decimal = parseInt(partialHex, 16);

    // Divide by max possible 8-char hex value to get a clean float (0.0 to 1.0)
    const floatResult = decimal / 4294967296;

    return floatResult;
};

/**
 * ==========================================
 * TEXAS HOLD'EM - DECK SHUFFLER
 * ==========================================
 * Uses the Fisher-Yates shuffle algorithm powered by our cryptographic float generator.
 */

/**
 * Generates a fully shuffled standard 52-card deck.
 * @param {string} serverSeed 
 * @param {string} clientSeed 
 * @param {string} handId - Unique ID for the current Poker hand
 * @returns {Array} Array of card objects { value, suit }
 */
const getShuffledDeck = (serverSeed, clientSeed, handId) => {
    // 1. Initialize standard 52-card deck
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ value, suit });
        }
    }

    // 2. Cryptographic Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        // Generate a unique float for every single card swap
        const uniqueNonce = `${handId}-shuffle-index-${i}`;
        const float = calculateFloatResult(serverSeed, clientSeed, uniqueNonce);
        
        // Pick a random index from 0 to i
        const j = Math.min(i, Math.floor(float * (i + 1)));
        
        // Swap cards
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck; // The beautifully, provably mixed deck
};

module.exports = {
    generateServerSeed,
    generateClientSeed,
    calculateFloatResult,
    getShuffledDeck
};
