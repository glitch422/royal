/**
 * ==========================================
 * ROYAL CASINO - POKER HAND EVALUATOR
 * ==========================================
 * Evaluates the strength of player hands at Showdown,
 * determines the winner(s), and handles split pots.
 */

const Hand = require('pokersolver').Hand;
const logger = require('./logger');

/**
 * Converts our internal card format { value: '10', suit: 'Hearts' }
 * to the format pokersolver expects: 'Th' (Ten of Hearts).
 * @param {Object} card 
 * @returns {string} Formatted card string
 */
const formatCardForSolver = (card) => {
    let val = card.value;
    // pokersolver uses 'T' for 10
    if (val === '10') val = 'T';
    
    let suitChar;
    switch (card.suit) {
        case 'Spades': suitChar = 's'; break;
        case 'Hearts': suitChar = 'h'; break;
        case 'Diamonds': suitChar = 'd'; break;
        case 'Clubs': suitChar = 'c'; break;
        default: throw new Error(`Unknown suit: ${card.suit}`);
    }
    
    return `${val}${suitChar}`;
};

/**
 * Evaluates all active players at showdown and determines the winner(s).
 * @param {Array} players - Array of player objects from PokerTable
 * @param {Array} communityCards - The 5 cards on the board
 * @returns {Object} { winners: Array, handDetails: Object }
 */
const determineWinners = (players, communityCards) => {
    // 1. Format the 5 community cards
    const board = communityCards.map(formatCardForSolver);
    
    const solvedHands = [];
    const playerHandMap = {};

    // 2. Evaluate each player's best 5-card combination out of their 7 cards
    players.forEach(player => {
        // Only evaluate players who are still in the hand (ACTIVE or ALL_IN)
        if (player && (player.status === 'ACTIVE' || player.status === 'ALL_IN')) {
            const holeCards = player.holeCards.map(formatCardForSolver);
            const allSevenCards = [...holeCards, ...board];
            
            // pokersolver calculates the best hand automatically
            const solvedHand = Hand.solve(allSevenCards);
            solvedHand.userId = player.id;
            solvedHand.username = player.username;
            
            solvedHands.push(solvedHand);
            playerHandMap[player.id] = {
                name: solvedHand.name, // e.g., "Two Pair"
                descr: solvedHand.descr // e.g., "Two Pair, Aces and Eights"
            };
        }
    });

    if (solvedHands.length === 0) {
        throw new Error('No active players found for showdown evaluation.');
    }

    // 3. Compare all hands to find the winner(s)
    // Hand.winners returns an array. If there is a tie, it returns multiple hands.
    const winningHands = Hand.winners(solvedHands);
    
    const winners = winningHands.map(hand => ({
        id: hand.userId,
        username: hand.username,
        description: hand.descr
    }));

    // Log the showdown results
    logger.info(`Showdown completed. Winners: ${winners.map(w => w.username).join(', ')} with ${winners[0].description}`);

    return {
        winners,
        playerHandMap
    };
};

module.exports = {
    determineWinners
};
