/**
 * ==========================================
 * ROYAL - STRATEGIC LIVE PEEK (GOD VIEW)
 * ==========================================
 * Root/Admin exclusive React component to monitor live strategic modules.
 * Bypasses fog-of-war to reveal hidden hole cards and the future deck.
 * Incorporates Stealth Mode, Ghost presence, and rigid Kick/Ban hierarchy.
 */

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext'; // Added for hierarchy validation

// Helper function to render authentic poker suit symbols
const getSuitSymbol = (suit) => {
    if (!suit) return '';
    switch (suit.toLowerCase()) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'spades': return '♠';
        case 'clubs': return '♣';
        default: return suit[0].toUpperCase();
    }
};

const AdminLivePeek = () => {
    // godView contains table data, emit functions handle actions
    const { godView, emitKick, emitBan } = useSocket();
    const { user } = useAuth(); // Contains current logged-in personnel (role: 'root', 'admin', 'support')

    // Hierarchy Validation Logic for Kick/Ban actions
    const canEnforce = (targetRole) => {
        if (!user || !user.role) return false;
        if (user.role === 'root') return true; // Root controls all
        if (user.role === 'admin' && targetRole !== 'root') return true; // Admin controls all except Root
        if (user.role === 'support' && targetRole === 'player') return true; // Support controls only players
        return false;
    };

    // Loading / No Access State
    if (!godView) {
        return (
            <div className="flex flex-col items-center justify-center h-72 bg-[#061423] text-[#D4AF37] font-bold p-8 rounded-2xl border border-[#D4AF37]/20 shadow-2xl shadow-[#0B223A]/50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37] mb-4"></div>
                <p className="tracking-widest uppercase text-sm font-mono">Awaiting Secure Module Connection...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#0B223A] p-6 md:p-8 rounded-2xl border border-[#1a365d] shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-slate-200 font-sans relative">
            
            {/* --- GHOST MODE INDICATOR --- */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-zinc-900/90 text-[#D4AF37] text-[10px] px-6 py-1 rounded-b-lg font-mono tracking-widest border-b border-l border-r border-[#D4AF37]/30 shadow-lg z-20">
                GHOST MODE ACTIVE - INVISIBLE TO PLAYERS
            </div>

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-4 mb-8 border-b border-[#1a365d] pb-5 gap-4">
                <div>
                    <h2 className="text-[#D4AF37] font-black text-2xl md:text-3xl tracking-widest flex items-center gap-3 drop-shadow-md uppercase">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-[#dc2626]"></span>
                        </span>
                        Strategic Overview <span className="text-[#64748b] font-light ml-2">| GOD VIEW</span>
                    </h2>
                    <p className="text-xs text-[#94a3b8] mt-1 uppercase tracking-widest font-mono">Command Center Access</p>
                </div>
                
                <div className="bg-[#061423] border border-[#1a365d] rounded-lg px-6 py-3 flex flex-col items-end shadow-inner">
                    <div className="text-[#94a3b8] text-sm uppercase tracking-wider mb-1">
                        Module ID: <span className="text-[#D4AF37] font-mono font-bold tracking-normal">{godView.tableId}</span>
                    </div>
                    <div className="text-[#94a3b8] text-sm uppercase tracking-wider">
                        Active Portfolio: <span className="text-[#10b981] font-mono font-bold text-lg tracking-normal">{godView.pot} CROWN</span>
                    </div>
                </div>
            </div>

            {/* --- PLAYERS GRID (Revealing Hole Cards & Controls) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {godView.players.map((player, index) => {
                    if (!player) return null;
                    
                    const isFolded = player.status === 'FOLDED';
                    const isAllIn = player.status === 'ALL_IN';
                    const targetRole = player.role || 'player'; // default to player if undefined

                    return (
                        <div key={player.id || index} className="bg-gradient-to-b from-[#0f2942] to-[#061423] p-5 rounded-xl border border-[#1a365d] relative overflow-hidden shadow-xl hover:border-[#D4AF37]/30 transition-colors">

                            {/* Overlay for Folded Players */}
                            {isFolded && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-300">
                                    <span className="text-red-500/90 font-black rotate-[-15deg] text-3xl tracking-widest border-4 border-red-500/90 py-2 px-4 rounded-md shadow-2xl uppercase">
                                        Folded
                                    </span>
                                </div>
                            )}

                            {/* Player Header & Enforcement Controls */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[#D4AF37] font-bold text-lg tracking-wide truncate">
                                        @{player.username}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{targetRole}</p>
                                </div>
                                
                                <div className="flex flex-col items-end gap-1 relative z-20">
                                    {isAllIn && (
                                        <span className="bg-[#dc2626] text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse uppercase tracking-widest mb-1">
                                            Max Allocation
                                        </span>
                                    )}
                                    {/* Command Actions (Kick / Ban) based on Hierarchy */}
                                    {canEnforce(targetRole) && (
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => emitKick(player.id)}
                                                className="bg-orange-600/20 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-600/50 text-[9px] px-2 py-1 rounded uppercase tracking-wider transition-all"
                                                title="Kick from Module"
                                            >
                                                Kick
                                            </button>
                                            <button 
                                                onClick={() => emitBan(player.id)}
                                                className="bg-[#dc2626]/20 hover:bg-[#dc2626] text-[#dc2626] hover:text-white border border-[#dc2626]/50 text-[9px] px-2 py-1 rounded uppercase tracking-wider transition-all"
                                                title="Permanent Ban"
                                            >
                                                Ban
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Chips & Bet Info (CROWN Based) */}
                            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300 mb-5 font-mono bg-[#061423] p-2 rounded-lg border border-[#1a365d]">
                                <div className="flex flex-col">
                                    <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Stack</span>
                                    <span className="text-[#10b981] font-semibold">{player.chips} CR</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Bet</span>
                                    <span className="text-[#D4AF37]">{player.currentBet} CR</span>
                                </div>
                            </div>

                            {/* The specific "Peek" section */}
                            <div className="bg-[#061423]/80 p-4 rounded-lg border border-[#D4AF37]/20">
                                <p className="text-[10px] text-[#D4AF37]/80 mb-3 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <span>👁️</span> X-Ray Vision
                                </p>
                                <div className="flex justify-center gap-3">
                                    {player.holeCards && player.holeCards.length > 0 ? (
                                        player.holeCards.map((card, cIdx) => {
                                            const isRedSuit = card.suit === 'hearts' || card.suit === 'diamonds';
                                            return (
                                                <div 
                                                    key={cIdx} 
                                                    className={`flex flex-col items-center justify-center w-12 h-16 bg-zinc-100 rounded shadow-[inset_0_0_8px_rgba(0,0,0,0.1)] border border-zinc-400 transform transition-transform hover:-translate-y-1 ${isRedSuit ? 'text-[#dc2626]' : 'text-zinc-900'}`}
                                                >
                                                    <span className="font-bold text-lg leading-none">{card.value}</span>
                                                    <span className="text-2xl leading-none">{getSuitSymbol(card.suit)}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-16 flex items-center justify-center w-full">
                                            <span className="text-[#64748b] text-[10px] font-mono uppercase tracking-widest border border-dashed border-[#1a365d] px-4 py-2 rounded">
                                                Awaiting Deal
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- FUTURE DECK SECTION (Upcoming Cards) --- */}
            <div className="bg-[#061423] rounded-xl border border-[#1a365d] relative overflow-hidden shadow-inner mt-8">
                {/* Security Badge */}
                <div className="absolute top-0 right-0 bg-[#0B223A] text-[#10b981] text-[10px] px-3 py-1 rounded-bl-lg font-mono tracking-widest border-b border-l border-[#1a365d]">
                    PROVABLY FAIR HASH VERIFIED
                </div>
                
                <div className="p-5 md:p-6">
                    <h3 className="text-[#D4AF37] font-bold mb-4 uppercase tracking-widest flex items-center gap-2 text-sm">
                        <span>🔮</span> The Future Deck <span className="text-[#64748b] font-mono font-normal text-[10px] ml-1 uppercase">(Next Cards To Be Dealt)</span>
                    </h3>
                    
                    <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                        {godView.futureCards && godView.futureCards.length > 0 ? (
                            godView.futureCards.map((card, i) => {
                                const isRedSuit = card.suit === 'hearts' || card.suit === 'diamonds';
                                return (
                                    <div 
                                        key={i} 
                                        className={`flex flex-col items-center justify-center min-w-[40px] h-14 bg-zinc-100 rounded shadow-sm border-2 border-transparent hover:border-[#D4AF37] transition-all cursor-crosshair shrink-0 ${isRedSuit ? 'text-[#dc2626]' : 'text-zinc-900'}`}
                                        title={`Card #${i + 1} in deck`}
                                    >
                                        <span className="font-bold text-sm leading-none">{card.value}</span>
                                        <span className="text-lg leading-none">{getSuitSymbol(card.suit)}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <span className="text-[#64748b] text-[10px] font-mono uppercase tracking-widest p-2">
                                Deck is currently empty or shuffling.
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Scrollbar CSS for the Future Deck */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #0B223A; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1a365d; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #D4AF37; 
                }
            `}} />
        </div>
    );
};

export default AdminLivePeek;
