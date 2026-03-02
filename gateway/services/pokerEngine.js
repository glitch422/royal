/**
 * ==========================================
 * ROYAL CASINO - TEXAS HOLD'EM POKER ENGINE
 * ==========================================
 * Core Game Engine for managing table states, players, 
 * deck shuffling (Provably Fair), betting actions, 
 * Time Banks, Casino Rake, and Side Pot logic.
 * * Author: Marc Laurent / Gemini Collaboration
 * Date: 2026-02-20
 */

const { generateServerSeed, generateClientSeed, getShuffledDeck } = require('../utils/provablyFair');
const logger = require('../utils/logger');
const { determineWinners } = require('../utils/handEvaluator');
const { ECONOMY_RULES } = require('../utils/cryptoConfig');

// Define the valid states of a Texas Hold'em hand
const TABLE_STATES = {
    WAITING: 'WAITING_FOR_PLAYERS',
    PRE_FLOP: 'PRE_FLOP',
    FLOP: 'FLOP',
    TURN: 'TURN',
    RIVER: 'RIVER',
    SHOWDOWN: 'SHOWDOWN'
};

class PokerTable {
    /**
     * @param {string} tableId - Unique ID
     * @param {number} smallBlind - Small blind value
     * @param {number} bigBlind - Big blind value
     * @param {number} maxSeats - Max players (default 9)
     */
    constructor(tableId, smallBlind, bigBlind, maxSeats = 9) {
        this.tableId = tableId;
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
        this.maxSeats = maxSeats;
        
        this.state = TABLE_STATES.WAITING;
        this.players = new Array(maxSeats).fill(null);
        
        this.pot = 0;
        this.communityCards = [];
        this.deck = [];
        
        this.dealerButtonIndex = 0;
        this.currentPlayerIndex = -1;
        this.currentHighestBet = 0;
        
        this.handId = null;
        this.lastAggressorIndex = -1; 
        
        // Timer Mechanics (1 Minute / 60,000 ms)
        this.turnTimer = null;
        this.onTimeoutCallback = null; 
    }

    /**
     * Adds a player to the table
     */
    addPlayer(user, seatIndex, buyInAmount) {
        if (seatIndex < 0 || seatIndex >= this.maxSeats) throw new Error('Invalid seat index');
        if (this.players[seatIndex] !== null) throw new Error('Seat is already taken');

        this.players[seatIndex] = {
            id: user.id,
            username: user.username,
            chips: buyInAmount,
            holeCards: [],
            currentBet: 0, 
            totalInvested: 0, // CRITICAL: Used for Side Pot calculations
            status: 'WAITING', 
            isSittingOut: false,
            hasActed: false 
        };

        logger.info(`Player ${user.username} joined Table ${this.tableId} at seat ${seatIndex}.`);
        return true;
    }

    /**
     * Removes a player and cleans up if it was their turn
     */
    removePlayer(userId) {
        const seatIndex = this.players.findIndex(p => p && p.id === userId);
        if (seatIndex !== -1) {
            this.players[seatIndex] = null;
            if (this.currentPlayerIndex === seatIndex && this.state !== TABLE_STATES.WAITING) {
                this._clearTurnTimer();
                this._advanceTurn();
            }
        }
    }

    getActivePlayersCount() {
        return this.players.filter(p => p !== null && !p.isSittingOut && p.status !== 'FOLDED' && p.chips > 0).length;
    }

    /**
     * Starts a new hand with Provably Fair shuffling
     */
    startHand() {
        if (this.state !== TABLE_STATES.WAITING && this.state !== TABLE_STATES.SHOWDOWN) {
            throw new Error('Hand is already in progress');
        }

        this._clearTurnTimer();
        this.handId = `HAND-${Date.now()}`;
        this.state = TABLE_STATES.PRE_FLOP;
        this.pot = 0;
        this.communityCards = [];
        this.currentHighestBet = this.bigBlind;

        // Provably Fair Deck Generation
        const { serverSeed, serverSeedHash } = generateServerSeed();
        const clientSeed = generateClientSeed();
        this.deck = getShuffledDeck(serverSeed, clientSeed, this.handId);

        logger.info(`Starting Hand ${this.handId}. Hash: ${serverSeedHash}`);

        this.players.forEach(p => {
            if (p && !p.isSittingOut && p.chips > 0) {
                p.status = 'ACTIVE';
                p.holeCards = [];
                p.currentBet = 0;
                p.totalInvested = 0;
                p.hasActed = false;
            } else if (p) {
                p.status = 'WAITING';
            }
        });

        if (this.getActivePlayersCount() < 2) {
            this.state = TABLE_STATES.WAITING;
            throw new Error('Not enough players to start a hand');
        }

        this.dealerButtonIndex = this._getNextActivePlayerIndex(this.dealerButtonIndex);
        const smallBlindIndex = this._getNextActivePlayerIndex(this.dealerButtonIndex);
        const bigBlindIndex = this._getNextActivePlayerIndex(smallBlindIndex);
        
        this._postBlind(smallBlindIndex, this.smallBlind);
        this._postBlind(bigBlindIndex, this.bigBlind);

        this.lastAggressorIndex = bigBlindIndex;

        // Deal 2 Hole Cards
        for (let i = 0; i < 2; i++) {
            let currentIndex = smallBlindIndex;
            do {
                if (this.players[currentIndex] && this.players[currentIndex].status === 'ACTIVE') {
                    this.players[currentIndex].holeCards.push(this.deck.pop());
                }
                currentIndex = this._getNextActivePlayerIndex(currentIndex);
            } while (currentIndex !== smallBlindIndex);
        }

        this.currentPlayerIndex = this._getNextActivePlayerIndex(bigBlindIndex);
        this._startTurnTimer(); 
    }

    /**
     * Processes player decisions (Fold, Check, Call, Raise, All-in)
     */
    playerAction(userId, actionType, amount = 0) {
        const player = this.players[this.currentPlayerIndex];
        
        if (!player || player.id !== userId) {
            throw new Error("It's not your turn!");
        }

        if (player.status !== 'ACTIVE') {
            throw new Error("Player cannot act in current state.");
        }

        const amountToCall = this.currentHighestBet - player.currentBet;

        switch (actionType.toUpperCase()) {
            case 'FOLD':
                player.status = 'FOLDED';
                logger.info(`${player.username} FOLDS.`);
                break;

            case 'CHECK':
                if (amountToCall > 0) throw new Error("Cannot check. Must call or raise.");
                logger.info(`${player.username} CHECKS.`);
                break;

            case 'CALL':
                if (amountToCall <= 0) throw new Error("Nothing to call.");
                const actualCallAmount = Math.min(player.chips, amountToCall);
                this._processBet(player, actualCallAmount);
                if (player.chips === 0) player.status = 'ALL_IN';
                logger.info(`${player.username} CALLS ${actualCallAmount}.`);
                break;

            case 'RAISE':
                const totalRaiseAmount = amountToCall + amount;
                if (player.chips < totalRaiseAmount) throw new Error("Not enough chips.");
                this._processBet(player, totalRaiseAmount);
                this.currentHighestBet = player.currentBet;
                this.lastAggressorIndex = this.currentPlayerIndex;
                if (player.chips === 0) player.status = 'ALL_IN';
                this._resetHasActedForOthers(this.currentPlayerIndex);
                logger.info(`${player.username} RAISES to ${player.currentBet}.`);
                break;

            case 'ALL_IN':
                const allInAmount = player.chips;
                this._processBet(player, allInAmount);
                player.status = 'ALL_IN';
                if (player.currentBet > this.currentHighestBet) {
                    this.currentHighestBet = player.currentBet;
                    this.lastAggressorIndex = this.currentPlayerIndex;
                    this._resetHasActedForOthers(this.currentPlayerIndex);
                }
                logger.info(`${player.username} goes ALL-IN with ${allInAmount}!`);
                break;

            default:
                throw new Error("Invalid action type");
        }

        this._clearTurnTimer();
        player.hasActed = true;
        this._advanceTurn();
    }

    // --- TIME BANK (1 MINUTE) ---
    _startTurnTimer() {
        this._clearTurnTimer();
        if (this.state === TABLE_STATES.SHOWDOWN || this.state === TABLE_STATES.WAITING) return;

        this.turnTimer = setTimeout(() => {
            const player = this.players[this.currentPlayerIndex];
            if (player && player.status === 'ACTIVE') {
                logger.info(`[TIMER] Player ${player.username} timed out.`);
                const amountToCall = this.currentHighestBet - player.currentBet;
                try {
                    // Auto-Check if possible, else Auto-Fold
                    this.playerAction(player.id, amountToCall === 0 ? 'CHECK' : 'FOLD');
                    if (this.onTimeoutCallback) this.onTimeoutCallback(this.tableId);
                } catch (error) {
                    logger.error(`[TIMER] Error: ${error.message}`);
                }
            }
        }, 60000); 
    }

    _clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
    }

    // --- GAME FLOW & SIDE POTS ---
    _advanceTurn() {
        const activeOrAllIn = this.players.filter(p => p && (p.status === 'ACTIVE' || p.status === 'ALL_IN'));
        
        // Single player remaining? They win the pot.
        if (activeOrAllIn.filter(p => p.status !== 'FOLDED').length === 1) {
            this.executeShowdown();
            return; 
        }

        const isRoundOver = this.players.every(p => {
            if (!p || p.status === 'FOLDED' || p.status === 'ALL_IN' || p.status === 'WAITING') return true;
            return p.hasActed && p.currentBet === this.currentHighestBet;
        });

        if (isRoundOver) {
            this._advanceToNextStreet();
        } else {
            this.currentPlayerIndex = this._getNextActivePlayerIndex(this.currentPlayerIndex);
            // Skip All-In players for actions
            while (this.players[this.currentPlayerIndex].status === 'ALL_IN') {
                this.currentPlayerIndex = this._getNextActivePlayerIndex(this.currentPlayerIndex);
            }
            this._startTurnTimer(); 
        }
    }

    _advanceToNextStreet() {
        this._resetBetsForNextStreet();
        switch (this.state) {
            case TABLE_STATES.PRE_FLOP: this.dealFlop(); break;
            case TABLE_STATES.FLOP:     this.dealTurn(); break;
            case TABLE_STATES.TURN:     this.dealRiver(); break;
            case TABLE_STATES.RIVER:    this.executeShowdown(); break;
        }
    }

    /**
     * SHOWDOWN & SIDE POTS CALCULATION
     */
    executeShowdown() {
        this._clearTurnTimer();
        this.state = TABLE_STATES.SHOWDOWN;
        logger.info(`Hand ${this.handId} Showdown.`);

        // 1. Deduct Casino Rake
        const rakeAmount = Math.floor(this.pot * (ECONOMY_RULES.POT_RAKE_PERCENTAGE / 100));
        const netPot = this.pot - rakeAmount;
        logger.info(`💰 CASINO RAKE: ${rakeAmount}. Net Pot: ${netPot}`);

        // 2. Split into Side Pots based on investment tiers
        const sidePots = this._calculateSidePots(netPot, this.pot);

        // 3. Distribute each pot tier to respective winners
        sidePots.forEach((pot, index) => {
            const eligiblePlayers = this.players.filter(p => p && pot.eligibleUserIds.includes(p.id));
            if (eligiblePlayers.length === 0) return;

            if (eligiblePlayers.length === 1) {
                const winner = eligiblePlayers[0];
                winner.chips += pot.amount;
                logger.info(`${winner.username} wins Side Pot #${index+1} (${pot.amount})`);
            } else {
                const { winners } = determineWinners(eligiblePlayers, this.communityCards);
                const splitAmount = Math.floor(pot.amount / winners.length);
                const remainder = pot.amount % winners.length;

                winners.forEach((winnerInfo, wIndex) => {
                    const player = this.players.find(p => p && p.id === winnerInfo.id);
                    const payout = splitAmount + (wIndex === 0 ? remainder : 0);
                    player.chips += payout;
                    logger.info(`${player.username} wins ${payout} (Pot #${index+1}) with ${winnerInfo.description}`);
                });
            }
        });

        this.pot = 0;
        this.state = TABLE_STATES.WAITING;
    }

    /**
     * Logic to handle players with different All-In amounts
     */
    _calculateSidePots(netPot, grossPot) {
        const playersWithInvestment = this.players
            .filter(p => p && p.totalInvested > 0)
            .map(p => ({ id: p.id, invested: p.totalInvested, status: p.status }));

        const tiers = [...new Set(playersWithInvestment.map(p => p.invested))].sort((a, b) => a - b);
        
        let sidePots = [];
        let accumulatedTier = 0;
        let distributedNet = 0;

        for (let i = 0; i < tiers.length; i++) {
            const currentTier = tiers[i];
            const tierAmount = currentTier - accumulatedTier;
            let potGross = 0;
            let eligibleUserIds = [];

            playersWithInvestment.forEach(p => {
                if (p.invested > 0) {
                    const contribution = Math.min(p.invested, tierAmount);
                    potGross += contribution;
                    p.invested -= contribution;
                    if (p.status !== 'FOLDED') eligibleUserIds.push(p.id);
                }
            });

            if (potGross > 0) {
                let potNet = (i === tiers.length - 1) 
                    ? netPot - distributedNet 
                    : Math.round((potGross / grossPot) * netPot);
                
                distributedNet += potNet;
                sidePots.push({ amount: potNet, eligibleUserIds });
            }
            accumulatedTier = currentTier;
        }
        return sidePots;
    }

    // --- CARD DEALING ---
    dealFlop() {
        this.state = TABLE_STATES.FLOP;
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop()); 
        this._setTurnToFirstPlayerAfterDealer();
        logger.info(`FLOP: ${this.communityCards.map(c => c.value + c.suit[0]).join(', ')}`);
    }

    dealTurn() {
        this.state = TABLE_STATES.TURN;
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop()); 
        this._setTurnToFirstPlayerAfterDealer();
        logger.info(`TURN: ${this.communityCards[3].value}${this.communityCards[3].suit[0]}`);
    }

    dealRiver() {
        this.state = TABLE_STATES.RIVER;
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop()); 
        this._setTurnToFirstPlayerAfterDealer();
        logger.info(`RIVER: ${this.communityCards[4].value}${this.communityCards[4].suit[0]}`);
    }

    // --- HELPERS ---
    _processBet(player, amount) {
        player.chips -= amount;
        player.currentBet += amount;
        player.totalInvested += amount;
        this.pot += amount;
    }

    _postBlind(seatIndex, amount) {
        const player = this.players[seatIndex];
        const actualBlind = Math.min(player.chips, amount);
        this._processBet(player, actualBlind);
        if (player.chips === 0) player.status = 'ALL_IN';
    }

    _getNextActivePlayerIndex(startIndex) {
        let index = (startIndex + 1) % this.maxSeats;
        while (index !== startIndex) {
            if (this.players[index] && (this.players[index].status === 'ACTIVE' || this.players[index].status === 'ALL_IN')) {
                return index;
            }
            index = (index + 1) % this.maxSeats;
        }
        return startIndex;
    }

    _resetBetsForNextStreet() {
        this.currentHighestBet = 0;
        this.lastAggressorIndex = -1;
        this.players.forEach(p => {
            if (p) {
                p.currentBet = 0;
                if (p.status === 'ACTIVE') p.hasActed = false;
            }
        });
    }

    _setTurnToFirstPlayerAfterDealer() {
        this.currentPlayerIndex = this._getNextActivePlayerIndex(this.dealerButtonIndex);
        while (this.players[this.currentPlayerIndex] && this.players[this.currentPlayerIndex].status === 'ALL_IN') {
            const nextIndex = this._getNextActivePlayerIndex(this.currentPlayerIndex);
            if (nextIndex === this.currentPlayerIndex) {
                this.executeShowdown();
                return;
            }
            this.currentPlayerIndex = nextIndex;
        }
        this._startTurnTimer(); 
    }

    _resetHasActedForOthers(raiserIndex) {
        this.players.forEach((p, index) => {
            if (p && p.status === 'ACTIVE' && index !== raiserIndex) p.hasActed = false;
        });
    }
}

module.exports = { TABLE_STATES, PokerTable };
