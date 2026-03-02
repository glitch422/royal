/**
 * ==========================================
 * ROYAL - GOD VIEW (ADMIN / ROOT)
 * ==========================================
 * In-app Live Peek that works in file:// mode (no iframe cross-origin issues).
 * Reveals:
 * - Hole cards for all seated players
 * - Community cards
 * - Dealer future (next 5) from hand.futureBoard
 *
 * Access: Admin / Root only.
 */
(function () {
  const SUITS = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function fmt(n, d = 2) {
    const x = Number(n || 0);
    if (!Number.isFinite(x)) return '0';
    return x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function role(stateObj) {
    return String(stateObj.role || stateObj.activeRole || 'guest').toLowerCase();
  }
  function canPeek(r) { return r === 'admin' || r === 'root'; }

  function renderCardSmall(card) {
    if (!card) {
      return `<div class="w-8 h-12 bg-gradient-to-br from-rcNavyPanel to-rcNavyBase border border-rcGold/40 rounded flex items-center justify-center shadow-md">
        <span class="text-rcGold text-lg opacity-60">♛</span>
      </div>`;
    }
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const textColor = isRed ? 'text-rcRed' : 'text-rcNavyBase';
    return `<div class="w-8 h-12 bg-white border border-zinc-400 rounded flex flex-col items-center justify-center shadow-md ${textColor}">
      <span class="font-bold text-[10px] leading-none">${escapeHtml(card.value)}</span>
      <span class="text-base leading-none">${SUITS[card.suit] || ''}</span>
    </div>`;
  }

  function tableFromState(store, stateObj) {
    const tableId = (stateObj.ui && stateObj.ui.activeTableId) ? stateObj.ui.activeTableId : 'tbl_main';
    return store.getTableById(tableId) || store.getTableById('tbl_main') || (store.listTables ? (store.listTables()[0] || null) : null);
  }

  window.renderReactAdminGodView = function (stateObj) {
    const r = role(stateObj);
    const allowed = canPeek(r);
    const store = window.ROYAL_STORE;

    if (!allowed) {
      return `
        <div class="w-full max-w-3xl mx-auto mt-10">
          <div class="bg-rcRed/10 border border-rcRed/30 rounded-3xl p-10 text-center">
            <div class="text-5xl mb-4">🚫</div>
            <div class="text-rcRed font-black uppercase tracking-widest">Access Denied</div>
            <div class="text-rcSlateLight text-sm mt-3">This module is restricted to Admin / Root.</div>
            <button onclick="window.navigateTo('smart_lobby')" class="mt-8 bg-rcNavyBase border border-rcNavyBorder text-rcSlateLight hover:text-white hover:border-rcGold font-bold py-3 px-6 rounded-2xl uppercase tracking-widest text-[10px] transition-all">
              Back to Lobby
            </button>
          </div>
        </div>
      `;
    }

    if (!store) {
      return `
        <div class="w-full max-w-3xl mx-auto mt-10">
          <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-10 text-center">
            <div class="text-rcGold font-black uppercase tracking-widest text-[10px]">SYSTEM</div>
            <div class="text-white font-black text-2xl mt-2">Store not ready</div>
            <div class="text-rcSlateLight text-sm mt-3">ROYAL_STORE is missing. Refresh the page.</div>
          </div>
        </div>
      `;
    }

    const table = tableFromState(store, stateObj);
    const users = store.loadUsers ? store.loadUsers() : [];
    const uById = Object.fromEntries(users.map(u => [u.id, u]));
    const seated = (table && table.seats) ? table.seats.filter(s => s && s.userId) : [];
    const waitingCount = (table && Array.isArray(table.waiting)) ? table.waiting.length : 0;
    const hand = table ? (table.hand || null) : null;
    const holeCards = hand ? (hand.holeCards || {}) : {};
    const community = hand ? (hand.community || []) : [];
    const future = hand ? ((hand.futureBoard || []).slice(0, 5)) : [];
    const pot = hand ? Number(hand.potCrown || 0) : 0;

    const playersHtml = seated.map(s => {
      const u = uById[s.userId] || { username: s.userId };
      const cards = (holeCards[s.userId] || []).map(renderCardSmall).join('');
      return `
        <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/20 border border-rcNavyBorder/60">
          <div>
            <div class="text-white font-bold">@${escapeHtml(u.username || 'player')}</div>
            <div class="text-rcSlateLight text-xs mt-1">Stack: <span class="text-rcGold font-mono font-black">${fmt(s.stackCrown || 0, 2)}</span> CROWN</div>
          </div>
          <div class="flex items-center gap-2">${cards || '<span class="text-rcSlateLight text-xs">–</span>'}</div>
          <button onclick="window.godKick('${escapeHtml(table.id)}','${escapeHtml(s.userId)}')" class="bg-rcRed/10 border border-rcRed/30 text-rcRed hover:bg-rcRed hover:text-white px-3 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">Kick</button>
        </div>
      `;
    }).join('');

    const commHtml = community.map(renderCardSmall).join('') || '<span class="text-rcSlateLight text-xs">–</span>';
    const futHtml = future.map(renderCardSmall).join('') || '<span class="text-rcSlateLight text-xs">–</span>';

    return `
      <div class="w-full max-w-7xl mx-auto fade-in">
        <div class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">GHOST MODE ACTIVE – INVISIBLE TO PLAYERS</div>
            <h2 class="text-white text-3xl font-black uppercase tracking-widest drop-shadow-md mt-2">Strategic Overview | GOD VIEW</h2>
            <div class="text-rcSlateLight text-xs font-mono uppercase tracking-widest mt-1">
              Viewer: <span class="text-white">@${escapeHtml(stateObj.user && stateObj.user.username ? stateObj.user.username : 'Admin')}</span> /
              <span class="text-rcGold">${escapeHtml(r)}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.enterTableSpectator('${escapeHtml(table ? table.id : 'tbl_main')}')" class="poker-chip-btn py-3 px-6 rounded-2xl text-rcNavyBase font-black uppercase tracking-widest text-[10px]">Enter Table (Spectator)</button>
            <button onclick="window.forceRerender && window.forceRerender()" class="bg-rcNavyBase border border-rcNavyBorder text-rcSlateLight hover:text-white hover:border-rcGold font-bold py-3 px-5 rounded-2xl uppercase tracking-widest text-[10px] transition-all">Refresh</button>
            <button onclick="window.navigateTo('smart_lobby')" class="bg-rcNavyBase border border-rcNavyBorder text-rcSlateLight hover:text-white hover:border-rcGold font-bold py-3 px-5 rounded-2xl uppercase tracking-widest text-[10px] transition-all">Back</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-6 shadow-inner">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Table</div>
                  <div class="text-white font-black text-2xl mt-2">${escapeHtml(table ? table.name : 'No table')}</div>
                  <div class="text-rcSlateLight text-xs mt-2">Seats ${seated.length}/${table ? table.maxPlayers : 10} • Waiting ${waitingCount}</div>
                </div>
                <div class="bg-black/30 border border-rcGold/20 rounded-2xl px-4 py-3 text-right">
                  <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Pot</div>
                  <div class="text-rcGold font-mono font-black text-2xl">${fmt(pot, 2)} CROWN</div>
                </div>
              </div>

              <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-2xl bg-black/20 border border-rcNavyBorder/60">
                  <div class="text-rcSlateLight text-[10px] uppercase tracking-widest font-bold">Community</div>
                  <div class="flex gap-2 mt-3 flex-wrap">${commHtml}</div>
                </div>
                <div class="p-4 rounded-2xl bg-black/20 border border-rcNavyBorder/60">
                  <div class="text-rcSlateLight text-[10px] uppercase tracking-widest font-bold">Future (next 5)</div>
                  <div class="flex gap-2 mt-3 flex-wrap">${futHtml}</div>
                </div>
              </div>

              ${hand ? '' : `<div class="mt-4 bg-rcGold/10 border border-rcGold/30 rounded-2xl p-4 text-rcSlateLight text-sm">
                No active hand yet. Start seating players and the simulator will deal a hand automatically.
              </div>`}
            </div>

            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-6 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Players</div>
              <div class="text-white font-black text-xl mt-2">Hole Cards</div>
              <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                ${playersHtml || `<div class="text-rcSlateLight text-sm">No seated players.</div>`}
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-6 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Rules</div>
              <div class="text-white font-black text-xl mt-2">Live Peek Policy</div>
              <div class="text-rcSlateLight text-sm mt-3">
                Admin/Root can reveal hole cards and dealer future board. Players never see this.
              </div>
              <div class="mt-4 bg-black/20 border border-rcNavyBorder rounded-2xl p-4 text-rcSlateLight text-xs">
                Tip: Use <span class="text-white font-bold">Kick</span> to free a seat – the Waiting queue is FIFO and will auto-seat the next player.
              </div>
            </div>

            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-6 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Safety</div>
              <div class="text-white font-black text-xl mt-2">Invisible Entry</div>
              <div class="text-rcSlateLight text-sm mt-3">Entering the table in spectator mode does not occupy a seat.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.enterTableSpectator = function (tableId) {
    window.APP_STATE.ui = window.APP_STATE.ui || {};
    window.APP_STATE.ui.activeTableId = tableId || 'tbl_main';
    window.APP_STATE.ui.spectatorMode = true;
    window.navigateTo('poker_table');
  };

  window.godKick = function (tableId, userId) {
    try {
      const store = window.ROYAL_STORE;
      const actorRole = role(window.APP_STATE || {});
      store.kickPlayer(actorRole, tableId, userId, 'God View');
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      alert(String(e.message || e));
    }
  };
})();
