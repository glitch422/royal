/**
 * ==========================================
 * ROYAL CASINO - WEBSOCKET SERVER
 * ==========================================
 * Handles real-time communication for Texas Hold'em.
 * Bridges the Frontend actions with the Backend Poker Engine.
 * Features: Secure auth, Table Chat, and "God-Mode" for Admin/Root/CFO.
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const logger = require('../utils/logger');
const { PokerTable, TABLE_STATES } = require('../services/pokerEngine');

let io; // Instance of the socket.io server

// --- IN-MEMORY TABLE STORE ---
const activeTables = new Map();

// Initialize the VIP table (Standard starting table)
const defaultTable = new PokerTable('table_vip_1', 5, 10, 9); 
activeTables.set(defaultTable.tableId, defaultTable);

/**
 * Broadcasts the current state of a table.
 * LOGIC:
 * 1. Public State: Sent to everyone (Fog of war - hidden cards).
 * 2. Personal State: Sent to each player (Their own 2 cards).
 * 3. GOD-MODE: Sent to Admin/Root/CFO (Every card in the hand + future deck).
 */
const broadcastTableState = (tableId) => {
    if (!io) return;
    
    const table = activeTables.get(tableId);
    if (!table) return;

    const tableRoom = `table_${tableId}`;

    // 1. PUBLIC STATE (For standard players - Secure)
    const publicState = {
        tableId: table.tableId,
        state: table.state,
        pot: table.pot,
        communityCards: table.communityCards,
        dealerButtonIndex: table.dealerButtonIndex,
        currentPlayerIndex: table.currentPlayerIndex,
        currentHighestBet: table.currentHighestBet,
        players: table.players.map(p => {
            if (!p) return null;
            return {
                id: p.id,
                username: p.username,
                chips: p.chips,
                currentBet: p.currentBet,
                status: p.status,
                hasActed: p.hasActed,
                // Only reveal hole cards publicly if the hand is over (Showdown)
                holeCards: table.state === TABLE_STATES.SHOWDOWN ? p.holeCards : [] 
            };
        })
    };

    // Broadcast the limited information to everyone in the room
    io.to(tableRoom).emit('table_state_update', publicState);

    // 2. PRIVATE HOLE CARDS (To each specific player)
    if (table.state !== TABLE_STATES.SHOWDOWN) {
        table.players.forEach(p => {
            if (p && p.holeCards && p.holeCards.length > 0) {
                // Send hole cards only to the private room of that specific user
                io.to(`user_${p.id}`).emit('hole_cards_update', { holeCards: p.holeCards });
            }
        });
    }

    // 3. GOD-MODE BROADCAST (For Admin, Root, and CFO)
    const godViewState = {
        ...publicState,
        // Reveal ALL hole cards of EVERY player regardless of the game state
        players: table.players.map(p => {
            if (!p) return null;
            return {
                id: p.id,
                username: p.username,
                holeCards: p.holeCards 
            };
        }),
        // Reveal the "Future": The remaining deck sequence
        futureCards: table.deck.slice().reverse(), 
        handId: table.handId
    };

    // Iterate through all sockets in the table room and send God-View only to privileged roles
    const roomSockets = io.sockets.adapter.rooms.get(tableRoom);
    if (roomSockets) {
        for (const socketId of roomSockets) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.user) {
                const role = socket.user.role;
                // God-Mode access for Admin, Root, and CFO
                if (role === 'admin' || role === 'root' || role === 'cfo') {
                    socket.emit('god_view_update', godViewState);
                }
            }
        }
    }
};

// Link the engine's auto-action (timer) to our socket broadcast
defaultTable.onTimeoutCallback = (tableId) => {
    broadcastTableState(tableId);
};

const initSockets = (server) => {
    // 1. Setup Socket.io with secure CORS
    io = socketIo(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? [process.env.PRODUCTION_URL, process.env.PRODUCTION_WWW_URL]
                : [process.env.FRONTEND_URL, 'http://localhost:5173'],
            credentials: true 
        }
    });

    // 2. Authentication Middleware (JWT Check)
    io.use((socket, next) => {
        try {
            const cookieHeader = socket.request.headers.cookie;
            if (!cookieHeader) {
                logger.warn(`[Socket.io] Auth Blocked: No cookies found.`);
                return next(new Error('Authentication error'));
            }

            const cookies = cookie.parse(cookieHeader);
            const token = cookies.jwt;

            if (!token) return next(new Error('Authentication error'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; // Contains id, username, and role
            next();
            
        } catch (error) {
            logger.error(`[Socket.io] JWT Verification Failed: ${error.message}`);
            return next(new Error('Authentication error'));
        }
    });

    // 3. Connection Handler
    io.on('connection', (socket) => {
        logger.info(`🟢 WebSocket Connected: ${socket.user.username} (Role: ${socket.user.role})`);

        // Join personal room for private data (alerts, hole cards)
        const personalRoom = `user_${socket.user.id}`;
        socket.join(personalRoom);

        // --- POKER ACTIONS ---

        socket.on('join_table', ({ tableId, seatIndex, buyInAmount }) => {
            try {
                const table = activeTables.get(tableId);
                if (!table) throw new Error('Table not found');

                table.addPlayer(socket.user, seatIndex, buyInAmount);
                socket.join(`table_${tableId}`);
                
                logger.info(`[Game] ${socket.user.username} joined ${tableId} at seat ${seatIndex}`);
                broadcastTableState(tableId);
            } catch (error) {
                socket.emit('error_message', { message: error.message });
            }
        });

        socket.on('leave_table', ({ tableId }) => {
            try {
                const table = activeTables.get(tableId);
                if (table) {
                    table.removePlayer(socket.user.id);
                    socket.leave(`table_${tableId}`);
                    broadcastTableState(tableId);
                }
            } catch (error) {
                socket.emit('error_message', { message: error.message });
            }
        });

        socket.on('start_hand', ({ tableId }) => {
            try {
                const table = activeTables.get(tableId);
                if (!table) throw new Error('Table not found');

                table.startHand();
                broadcastTableState(tableId);
            } catch (error) {
                socket.emit('error_message', { message: error.message });
            }
        });

        socket.on('player_action', ({ tableId, actionType, amount }) => {
            try {
                const table = activeTables.get(tableId);
                if (!table) throw new Error('Table not found');

                table.playerAction(socket.user.id, actionType, amount);
                broadcastTableState(tableId);
            } catch (error) {
                socket.emit('error_message', { message: error.message });
            }
        });

        // --- CHAT SYSTEM ---
        socket.on('send_message', ({ tableId, message }) => {
            try {
                if (!message || message.trim().length === 0) return;
                if (message.length > 200) throw new Error("Message exceeds 200 characters");

                const chatMessage = {
                    id: Date.now(),
                    userId: socket.user.id,
                    username: socket.user.username,
                    role: socket.user.role,
                    text: message.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                io.to(`table_${tableId}`).emit('new_message', chatMessage);
            } catch (error) {
                socket.emit('error_message', { message: error.message });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`🔴 WebSocket Disconnected: ${socket.user.username}`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

module.exports = {
    initSockets,
    getIo,
    activeTables 
};
