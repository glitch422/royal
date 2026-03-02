/**
 * ==========================================
 * ROYAL - POKER TABLE (V7.0)
 * ==========================================
 * Multi-table renderer backed by ROYAL_STORE.
 *
 * Key requirements implemented:
 * - Seats show "SIT HERE" when table has more than 4 players
 * - Guest seat click opens register
 * - Player seat click triggers automatic buy-in
 * - Staff can enter table as spectators without being counted
 * - Live Peek for ROOT/ADMIN: reveal hole cards + future board
 * - Hover/Focus intel: below table shows user identity, balance, stats, hole cards (self) and dealer future cards (staff)
 * - Table chat for players
 * - Kick buttons for ROOT/ADMIN
 * - Deal animation + win animation (mock)
 */

(function () {
  const SUITS = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };

  function getStore() {
    return window.ROYAL_STORE;
  }

  function role(stateObj) {
    return String(stateObj.role || stateObj.activeRole || 'guest').toLowerCase();
  }

  function isStaff(r) {
    return ['admin','root'].includes(String(r || '').toLowerCase());
  }

  function canLivePeek(r) {
    return ['admin', 'root'].includes(String(r || '').toLowerCase());
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function avatarForUser(user) {
    if (window.ROYAL_AVATARS && window.ROYAL_AVATARS.avatarPathForUser) return window.ROYAL_AVATARS.avatarPathForUser(user);
    return 'assets/avatars/player1.jpeg';
  }

  function fmt(n, d = 2) {
    const x = Number(n || 0);
    if (!Number.isFinite(x)) return '0';
    return x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function seatPosClass(i) {
    const positions = [
      'bottom-2 left-1/2 -translate-x-1/2',
      'bottom-16 left-[14%]',
      'top-1/2 left-2 -translate-y-1/2',
      'top-16 left-[20%]',
      'top-4 left-[35%]',
      'top-4 right-[35%]',
      'top-16 right-[20%]',
      'top-1/2 right-2 -translate-y-1/2',
      'bottom-16 right-[14%]',
      // 10th seat (extra ring) - keeps maxPlayers=10 visible
      'bottom-16 left-1/2 -translate-x-1/2',
    ];
    return positions[i] || 'hidden';
  }

  // A lightweight “dealer → seat” fly-in animation for the start of each hand.
  // This is purely visual (UI-only). Game logic remains unchanged.
  function dealFromSeat(i) {
    const map = [
      { x: 0, y: 230 },
      { x: -260, y: 170 },
      { x: -320, y: 20 },
      { x: -240, y: -160 },
      { x: -120, y: -240 },
      { x: 120, y: -240 },
      { x: 240, y: -160 },
      { x: 320, y: 20 },
      { x: 260, y: 170 },
      { x: 0, y: 170 },
    ];
    return map[i] || { x: 0, y: 220 };
  }

  function renderDealFlyOverlay(table) {
    const hand = table ? (table.hand || null) : null;
    if (!hand || !hand.roundId) return '';

    window.APP_STATE.ui = window.APP_STATE.ui || {};
    const ui = window.APP_STATE.ui;

    // Start a new animation when roundId changes.
    if (ui.dealAnimRoundId !== hand.roundId) {
      ui.dealAnimRoundId = hand.roundId;
      ui.dealAnimUntil = Date.now() + 4200;
    }

    if (Date.now() > Number(ui.dealAnimUntil || 0)) return '';

    const dealer = Number.isFinite(Number(table.dealerIndex)) ? Number(table.dealerIndex) : 0;
    const max = Number(table.maxPlayers || 10);

    // Build dealing order: next occupied seats after dealer.
    const order = [];
    for (let step = 1; step <= max; step++) {
      const idx = (dealer + step) % max;
      const seat = (table.seats || [])[idx];
      if (seat && seat.userId) order.push(idx);
    }

    if (!order.length) return '';

    // 2 hole cards each, dealt around the table.
    const elements = [];
    const perCardDelay = 140;
    const betweenRoundsGap = 380;
    let k = 0;
    for (let round = 0; round < 2; round++) {
      for (const idx of order) {
        const pos = seatPosClass(idx);
        const from = dealFromSeat(idx);
        const delay = (k * perCardDelay) + (round === 1 ? betweenRoundsGap : 0);
        k++;

        elements.push(`
          <div class="absolute ${pos} z-30 pointer-events-none">
            <div class="deal-fly-cine" style="--fromX:${from.x}px; --fromY:${from.y}px; animation-delay:${delay}ms"></div>
          </div>
        `);
      }
    }

    return `<div class="absolute inset-0 pointer-events-none">${elements.join('')}</div>`;
  }

  function renderCard(card, hidden, extraClass = '') {
    if (hidden || !card) {
      return `
        <div class="w-10 h-14 md:w-12 md:h-16 bg-gradient-to-br from-rcNavyPanel to-rcNavyBase border border-rcGold/40 rounded flex items-center justify-center shadow-md ${extraClass}">
          <span class="text-rcGold text-xl opacity-50">♛</span>
        </div>
      `;
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const textColor = isRed ? 'text-rcRed' : 'text-rcNavyBase';
    return `
      <div class="w-10 h-14 md:w-12 md:h-16 bg-white border border-zinc-400 rounded flex flex-col items-center justify-center shadow-md ${textColor} ${extraClass}">
        <span class="font-bold text-sm leading-none">${escapeHtml(card.value)}</span>
        <span class="text-lg leading-none">${SUITS[card.suit] || ''}</span>
      </div>
    `;
  }

  function renderCardSmall(card, hidden = false) {
    if (hidden || !card) {
      return `
        <div class="w-8 h-12 bg-gradient-to-br from-rcNavyPanel to-rcNavyBase border border-rcGold/40 rounded flex items-center justify-center shadow-md">
          <span class="text-rcGold text-lg opacity-60">♛</span>
        </div>
      `;
    }
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const textColor = isRed ? 'text-rcRed' : 'text-rcNavyBase';
    return `
      <div class="w-8 h-12 bg-white border border-zinc-400 rounded flex flex-col items-center justify-center shadow-md ${textColor}">
        <span class="font-bold text-[10px] leading-none">${escapeHtml(card.value)}</span>
        <span class="text-base leading-none">${SUITS[card.suit] || ''}</span>
      </div>
    `;
  }

  function renderSeatEmpty(i, r, label) {
    const pos = seatPosClass(i);
    return `
      <div class="absolute ${pos} flex flex-col items-center z-10 opacity-80 hover:opacity-100 transition-all">
        <button onclick="window.handleSeatClick(${i})" class="w-14 h-14 rounded-full border-2 border-dashed border-rcGold/50 bg-rcNavyBase/80 flex items-center justify-center text-rcGold hover:bg-rcGold hover:text-rcNavyBase transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] backdrop-blur-sm group cursor-pointer">
          <span class="text-[9px] font-black uppercase tracking-widest hidden group-hover:block">${label}</span>
          <span class="text-2xl group-hover:hidden">+</span>
        </button>
        <span class="text-[9px] text-rcGold uppercase tracking-widest mt-2 font-bold bg-rcNavyBase/90 px-2 py-0.5 rounded border border-rcGold/30 shadow-lg">Empty</span>
      </div>
    `;
  }

  function renderSeatOccupied(i, seat, viewerRole, tableId) {
    const store = getStore();
    const user = store.getUserById(seat.userId);
    const pos = seatPosClass(i);
    if (!user) return '';

    const isSelf = (window.APP_STATE.user || {}).id === user.id;
    const peek = canLivePeek(viewerRole);

    const stats = user.stats || {};
    const hoverStats = (viewerRole === 'player') ? `VPIP ${fmt(stats.vpip, 0)}% • PFR ${fmt(stats.pfr, 0)}% • AF ${fmt(stats.af, 1)}` : `Hands ${fmt(stats.hands,0)} • W/L ${fmt(stats.winLoss,0)}`;

    const canModerate = ['admin','root'].includes(String(viewerRole||'').toLowerCase());
    const muteState = store.isMuted ? store.isMuted(user.id) : { muted:false, remainingMs:0, reason:'' };

    const muteBtn = (canModerate) ? `
      <button onclick="window.toggleMute('${tableId}','${user.id}')" class="absolute -top-2 -left-2 bg-black/70 border border-rcGold/30 text-rcGold w-7 h-7 rounded-full text-[10px] font-black shadow-lg hover:scale-105 transition-all" title="Mute/Unmute">${muteState.muted ? '🔇' : '🔊'}</button>
    ` : '';

    const kickBtn = (peek) ? `
      <button onclick="window.kickFromTable('${tableId}','${user.id}')" class="absolute -top-2 -right-2 bg-rcRed text-white w-7 h-7 rounded-full text-[10px] font-black shadow-lg hover:scale-105 transition-all" title="Kick player">✕</button>
    ` : '';

    return `
      <div class="absolute ${pos} flex flex-col items-center z-20" onmouseenter="window.showPlayerIntel('${user.id}')">
        <div class="relative bg-rcNavyPanel border border-rcNavyBorder rounded-xl p-2 w-28 flex flex-col items-center hover:border-rcGold/50 transition-colors cursor-pointer" onclick="window.showPlayerIntel('${user.id}', true)">
          ${kickBtn}${muteBtn}
          <img src="${avatarForUser(user)}" class="w-10 h-10 rounded-full border-2 border-rcNavyBase object-cover -mt-6 mb-1">
          <span class="text-[10px] text-white font-bold truncate w-full text-center">@${escapeHtml(user.username)}</span>
          <span class="text-[7px] text-rcSlateLight font-black uppercase tracking-widest leading-none mb-1">${escapeHtml(user.role)}</span>
          <span class="text-rcGreen font-mono text-[10px] font-bold mt-1 border-t border-rcNavyBorder w-full text-center pt-1">${fmt(seat.stackCrown, 1)} CR</span>
        </div>
        <div class="mt-2 bg-black/30 border border-rcNavyBorder rounded-full px-3 py-1 text-[9px] text-rcSlateLight font-mono" title="${escapeHtml(hoverStats)}">${escapeHtml(hoverStats)}</div>
      </div>
    `;
  }

  function renderTableCenter(table, viewerRole) {
    const store = getStore();
    const peek = canLivePeek(viewerRole);
    const hand = table.hand || {};

    const community = (hand.community || []).length ? hand.community : [];
    const cards = community.length
      ? community.map((c, idx) => renderCard(c, false, `deal-in deal-delay-${idx}`)).join('')
      : '<span class="text-[10px] text-rcSlate font-mono uppercase tracking-widest py-4 px-6">Waiting for the next hand...</span>';

    const pot = Number(hand.potCrown || 0);

    return `
      <div class="flex flex-col items-center z-10 mt-10">
        <div class="bg-rcNavyBase/90 backdrop-blur-md border border-rcGold/40 px-6 py-2 rounded-full flex flex-col items-center shadow-[0_0_30px_rgba(0,0,0,0.8)] mb-6">
          <span class="text-[9px] text-rcSlateLight uppercase tracking-widest font-bold">Pot</span>
          <span class="text-xl text-rcGold font-mono font-black">${fmt(pot, 0)} CROWN</span>
        </div>
        <div class="flex gap-2 p-3 bg-rcNavyPanel/60 backdrop-blur-md border border-rcNavyBorder rounded-xl shadow-inner">
          ${cards}
        </div>
        <div class="mt-5 text-[10px] text-rcSlateLight font-mono uppercase tracking-widest">Round: ${escapeHtml(hand.roundId || '–')}</div>
        ${peek ? `<div class="mt-2 text-[10px] text-rcGold font-black uppercase tracking-widest">Live Peek Active</div>` : ''}
      </div>
    `;
  }

  function renderDealerPeek(table, viewerRole) {
    if (!canLivePeek(viewerRole)) return '';
    const future = ((table.hand || {}).futureBoard || []).slice(0, 5);
    if (!future.length) return '';

    return `
      <div class="bg-black/20 border border-rcGold/20 rounded-2xl p-4">
        <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Dealer Future Board</div>
        <div class="text-rcSlateLight text-xs mt-2">Flop → Turn → River (peek only for Admin/Root)</div>
        <div class="flex gap-2 mt-3 flex-wrap">
          ${future.map((c, idx) => renderCard(c, false, `deal-in deal-delay-${idx}`)).join('')}
        </div>
      </div>
    `;
  }

  function renderGodViewPanel(table, viewerRole){
    if(!canLivePeek(viewerRole)) return '';
    const hand = table.hand || null;
    if(!hand || !hand.holeCards){ 
      return `<div class="mt-4 p-4 rounded-2xl border border-rcGold/30 bg-black/25">
        <div class="text-rcGold font-black uppercase tracking-widest text-xs">GOD VIEW</div>
        <div class="text-rcSlateLight text-xs mt-2">Waiting for an active hand to reveal hole cards and future board…</div>
      </div>`;
    }
    const future = (hand.futureBoard || []).slice(0,5);
    const community = (hand.community || []);
    const seats = (table.seats || []).filter(s=>s && s.userId);
    const users = (getStore().loadUsers && getStore().loadUsers()) || [];
    const uById = Object.fromEntries(users.map(u=>[u.id,u]));
    const rows = seats.map(s=>{
      const u = uById[s.userId] || { username: s.userId };
      const cards = (hand.holeCards[s.userId] || []).map(renderCardSmall).join('');
      return `<div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-rcNavyBorder/50">
        <div class="text-white font-bold">@${escapeHtml(u.username || 'player')}</div>
        <div class="flex items-center gap-2">${cards || '<span class="text-rcSlateLight text-xs">–</span>'}</div>
      </div>`;
    }).join('');
    const commHtml = (community.length?community:[]).map(renderCardSmall).join('');
    const futHtml = (future.length?future:[]).map(renderCardSmall).join('');
    return `<div class="mt-4 p-4 rounded-2xl border border-rcGold/30 bg-black/25">
      <div class="flex items-center justify-between">
        <div class="text-rcGold font-black uppercase tracking-widest text-xs">GOD VIEW • LIVE PEEK</div>
        <button onclick="window.navigateTo('react_admin_god_view')" class="poker-chip-btn px-4 py-2 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">Open Full God View</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        ${rows || `<div class="text-rcSlateLight text-xs">No seated players yet.</div>`}
      </div>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="p-3 rounded-xl bg-black/20 border border-rcNavyBorder/50">
          <div class="text-rcSlateLight text-[10px] uppercase tracking-widest font-bold">Community</div>
          <div class="flex gap-2 mt-2">${commHtml || '<span class="text-rcSlateLight text-xs">–</span>'}</div>
        </div>
        <div class="p-3 rounded-xl bg-black/20 border border-rcNavyBorder/50">
          <div class="text-rcSlateLight text-[10px] uppercase tracking-widest font-bold">Future (next 5)</div>
          <div class="flex gap-2 mt-2">${futHtml || '<span class="text-rcSlateLight text-xs">–</span>'}</div>
        </div>
      </div>
    </div>`;
  }


  function renderSelfCards(table, viewerRole) {
    const store = getStore();
    const uid = (window.APP_STATE.user || {}).id;
    const hand = table.hand || {};

    if (!uid) return '';

    const mine = (hand.holeCards || {})[uid] || [];
    const hasMine = mine.length === 2;

    const peek = canLivePeek(viewerRole);

    // If staff peek is on and a focused player exists, we show their cards too.
    const focusId = (window.APP_STATE.ui || {}).tableFocusUserId;
    const focusCards = focusId ? ((hand.holeCards || {})[focusId] || []) : [];

    const showFocus = peek && focusCards.length === 2 && focusId !== uid;

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-black/20 border border-rcNavyBorder rounded-2xl p-4">
          <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Your Hole Cards</div>
          <div class="flex gap-2 mt-3">
            ${hasMine ? mine.map((c, idx) => renderCard(c, false, `deal-in deal-delay-${idx}`)).join('') : [1,2].map(() => renderCard(null, true)).join('')}
          </div>
        </div>
        <div class="bg-black/20 border border-rcNavyBorder rounded-2xl p-4">
          <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Focus Cards</div>
          <div class="text-rcSlateLight text-xs mt-2">${showFocus ? escapeHtml(t('table.revealedForLivePeek')) : escapeHtml(t('table.hiddenUnlessStaffFocused'))}</div>
          <div class="flex gap-2 mt-3">
            ${showFocus ? focusCards.map((c, idx) => renderCard(c, false, `deal-in deal-delay-${idx}`)).join('') : [1,2].map(() => renderCard(null, true)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderChat(tableId, viewerRole) {
    const store = getStore();
    const msgs = store.getTableChat(tableId);

    const canSend = (viewerRole === 'player');

    const list = msgs.slice(-80).map(m => {
      if (m.fromUserId === 'system') {
        return `
          <div class="text-[10px] text-rcSlateLight font-mono bg-black/20 border border-rcNavyBorder rounded-xl p-3">${escapeHtml(m.text)}</div>
        `;
      }
      const u = store.getUserById(m.fromUserId);
      const name = u ? `@${u.username}` : 'Unknown';
      return `
        <div class="bg-black/20 border border-rcNavyBorder rounded-xl p-3">
          <div class="text-[8px] text-rcSlate uppercase tracking-widest font-bold">${escapeHtml(name)} • ${escapeHtml(new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}))}</div>
          <div class="text-[10px] text-white mt-2">${escapeHtml(m.text)}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-5 shadow-inner">
        <div class="flex items-center justify-between">
          <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Table Chat</div>
          <div class="text-[9px] text-rcSlateLight font-mono">Players can chat. Staff can monitor.</div>
        </div>
        <div id="table_chat_list" class="mt-4 h-56 overflow-y-auto custom-scrollbar flex flex-col gap-3">${list || '<div class="text-rcSlateLight text-sm">No messages yet.</div>'}</div>
        <div id="table_chat_error" class="text-rcRed text-[10px] font-black uppercase tracking-widest mt-3"></div>
        <div class="mt-4 flex gap-2">
          <input id="table_chat_input" ${canSend ? '' : 'disabled'} class="flex-1 poker-input p-3 rounded-xl text-sm ${canSend ? '' : 'opacity-40 cursor-not-allowed'}" placeholder="${canSend ? 'Message the table...' : 'Only players can send messages'}" onkeypress="if(event.key==='Enter') window.sendTableChat('${tableId}')"/>
          <button onclick="window.sendTableChat('${tableId}')" class="${canSend ? 'poker-chip-btn' : 'bg-rcNavyBase border border-rcNavyBorder text-rcSlate'} px-6 rounded-xl font-black" ${canSend ? '' : 'disabled'}>Send</button>
        </div>
      </div>
    `;
  }

  window.sendTableChat = function (tableId) {
    const store = getStore();
    const r = role(window.APP_STATE || {});
    if (r !== 'player') return;

    const input = document.getElementById('table_chat_input');
    if (!input) return;
    const text = String(input.value || '').trim();
    if (!text) return;

    const uid = (window.APP_STATE.user || {}).id;
    if (!uid) return;

    try {
      store.appendTableChat(tableId, { fromUserId: uid, text });
      input.value = '';
      const err = document.getElementById('table_chat_error');
      if (err) err.textContent = '';
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      const err = document.getElementById('table_chat_error');
      if (err) err.textContent = String(e.message || e);
      return;
    }
    setTimeout(() => {
      const el = document.getElementById('table_chat_list');
      if (el) el.scrollTop = el.scrollHeight;
    }, 10);
  };

  function renderIntelPanel(table, viewerRole) {
    const store = getStore();
    const focusId = (window.APP_STATE.ui || {}).tableFocusUserId;
    const u = focusId ? store.getUserById(focusId) : null;

    const selfId = (window.APP_STATE.user || {}).id;
    const self = selfId ? store.getUserById(selfId) : null;

    const focusBox = u ? `
      <div class="bg-black/20 border border-rcNavyBorder rounded-2xl p-5">
        <div class="flex items-start gap-4">
          <img src="${avatarForUser(u)}" class="w-14 h-14 rounded-2xl object-cover border border-rcGold/30"/>
          <div class="flex-1">
            <div class="text-white font-black text-lg">@${escapeHtml(u.username)}</div>
            <div class="text-rcSlateLight text-xs">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} • role: ${escapeHtml(u.role)} • status: ${escapeHtml(u.status)}</div>
            <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="bg-rcNavyBase border border-rcNavyBorder rounded-xl p-3">
                <div class="text-[8px] text-rcSlate uppercase tracking-widest font-bold">Balance</div>
                <div class="text-rcGold font-mono font-black">${fmt(u.balanceCrown, 2)} CR</div>
              </div>
              <div class="bg-rcNavyBase border border-rcNavyBorder rounded-xl p-3">
                <div class="text-[8px] text-rcSlate uppercase tracking-widest font-bold">VPIP</div>
                <div class="text-white font-mono font-black">${fmt((u.stats||{}).vpip, 0)}%</div>
              </div>
              <div class="bg-rcNavyBase border border-rcNavyBorder rounded-xl p-3">
                <div class="text-[8px] text-rcSlate uppercase tracking-widest font-bold">PFR</div>
                <div class="text-white font-mono font-black">${fmt((u.stats||{}).pfr, 0)}%</div>
              </div>
              <div class="bg-rcNavyBase border border-rcNavyBorder rounded-xl p-3">
                <div class="text-[8px] text-rcSlate uppercase tracking-widest font-bold">AF</div>
                <div class="text-white font-mono font-black">${fmt((u.stats||{}).af, 1)}</div>
              </div>
            </div>
          </div>
          ${canLivePeek(viewerRole) ? `<button onclick="window.kickFromTable('${table.id}','${u.id}')" class="bg-rcRed text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest">Kick</button>` : ''}
        </div>
      </div>
    ` : `
      <div class="bg-black/20 border border-rcNavyBorder rounded-2xl p-5">
        <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Intel</div>
        <div class="text-rcSlateLight text-sm mt-2">Hover a player to load the profile panel.</div>
      </div>
    `;

    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div class="lg:col-span-2 space-y-6">
          ${focusBox}
          ${renderSelfCards(table, viewerRole)}
        </div>
        <div class="space-y-6">
          ${renderDealerPeek(table, viewerRole)}
          ${renderChat(table.id, viewerRole)}
        </div>
      </div>
    `;
  }

  window.showPlayerIntel = function (userId, lock = false) {
    window.APP_STATE.ui = window.APP_STATE.ui || {};
    window.APP_STATE.ui.tableFocusUserId = userId;
    if (lock) window.APP_STATE.ui.tableFocusLocked = true;

    // Update the intel panel without full rerender to keep hover smooth.
    const panel = document.getElementById('table_intel_container');
    const store = getStore();
    const tableId = window.APP_STATE.ui.activeTableId || 'tbl_main';
    const table = store.getTableById(tableId);
    if (!panel || !table) return;

    panel.innerHTML = renderIntelPanel(table, role(window.APP_STATE || {}));
  };

  window.handleSeatClick = function (seatIndex) {
    const store = getStore();
    const r = role(window.APP_STATE || {});
    const tableId = (window.APP_STATE.ui || {}).activeTableId || 'tbl_main';

    if (r === 'guest') {
      window.navigateTo('auth_register');
      return;
    }

    if (r !== 'player') {
      // staff clicks do nothing (spectator)
      return;
    }

    const userId = (window.APP_STATE.user || {}).id;
    if (!userId) {
      window.navigateTo('auth_register');
      return;
    }

    try {
      store.seatPlayer({ userId, tableId, seatIndex });
      const u = store.getUserById(userId);
      if (u) window.APP_STATE.user.balance = u.balanceCrown;
      window.APP_STATE.ui.spectatorMode = false;
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.toLowerCase().includes('insufficient')) {
        window.APP_STATE.ui.pendingJoinTableId = tableId;
        if (window.openCryptoCheckoutModal) { window.openCryptoCheckoutModal(); } else { window.navigateTo('crypto_checkout'); }
      } else {
        alert(msg);
      }
    }
  };

  window.kickFromTable = function (tableId, userId) {
    const store = getStore();
    const r = role(window.APP_STATE || {});
    try {
      store.kickPlayer(r, tableId, userId, 'Manual kick');
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      alert(String(e.message || e));
    }
  };

  window.simulateTableHand = function () {
    const store = getStore();
    const r = role(window.APP_STATE || {});
    const tableId = (window.APP_STATE.ui || {}).activeTableId || 'tbl_main';

    if (!['admin', 'root'].includes(r)) {
      alert('Only Admin/Root can simulate hands in the mock.');
      return;
    }

    try {
      const hand = store.simulateHand(tableId);
      if (!hand) {
        alert('Cannot start a hand: at least 2 seated players are required, or the table is currently closed.');
        return;
      }
      if (typeof window.forceRerender === 'function') window.forceRerender();
      // Winner overlay will be shown when the hand actually finishes (event: ROYAL_HAND_FINISHED).
    } catch (e) {
      alert(String(e.message || e));
    }
  };

  function showWinnerOverlay(tableId, winnerUserId, amount) {
    const store = getStore();
    const u = store.getUserById(winnerUserId);
    const name = u ? `@${u.username}` : 'Winner';

    const overlay = document.createElement('div');
    overlay.className = 'winner-overlay';
    overlay.innerHTML = `
      <div class="winner-card">
        <div class="text-5xl mb-3">🏆</div>
        <div class="text-white font-black text-2xl uppercase tracking-widest">${escapeHtml(name)}</div>
        <div class="text-rcGold font-mono font-black text-3xl mt-2">+${fmt(amount, 1)} CROWN</div>
        <div class="text-rcSlateLight text-sm mt-3">Showdown complete. Cards revealed for this mock hand.</div>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('show'), 10);
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }, 2200);
  }

  
  // Winner overlay is triggered when the store dispatches ROYAL_HAND_FINISHED (end of a hand timeline).
  if (!window.__ROYAL_HAND_FIN_LISTENER__) {
    window.__ROYAL_HAND_FIN_LISTENER__ = true;
    window.addEventListener('ROYAL_HAND_FINISHED', function (ev) {
      try {
        const d = (ev && ev.detail) ? ev.detail : {};
        if (!d || !d.winnerUserId) return;
        showWinnerOverlay(d.tableId || 'tbl_main', d.winnerUserId, d.amount || 0);
      } catch (_) {}
    });
  }

window.renderStrategicModule = function (stateObj) {
    const store = getStore();
    const r = role(stateObj);

    const tableId = (stateObj.ui && stateObj.ui.activeTableId) ? stateObj.ui.activeTableId : 'tbl_main';
    const table = store.getTableById(tableId);
    if (!table) {
      return `
        <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 max-w-2xl mx-auto">
          <div class="text-rcRed font-black uppercase tracking-widest">Table not found</div>
          <button onclick="window.navigateTo('smart_lobby')" class="mt-6 poker-chip-btn px-6 py-3 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">Back to Lobby</button>
        </div>
      `;
    }

    
    const site = (store && store.getSiteStatus) ? store.getSiteStatus() : { scheduleEnabled:false, siteOpenNow:true, nextOpenAt:null, timezone:'local' };

    // Players cannot enter the table as spectators – they must be seated.
    const userId = (stateObj.user || {}).id;
    if (r === 'player') {
      if (!userId) {
        return `
          <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-8 max-w-2xl mx-auto text-center">
            <div class="text-5xl mb-4">🔒</div>
            <div class="text-white font-black text-2xl uppercase tracking-widest">Login Required</div>
            <div class="text-rcSlateLight text-sm mt-3">Please login to take a seat and play.</div>
            <button onclick="window.navigateTo('auth_login')" class="mt-6 poker-chip-btn px-6 py-3 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">Go to Login</button>
          </div>
        `;
      }
      const seated = (typeof store.isUserSeatedAtTable === 'function')
        ? store.isUserSeatedAtTable(userId, tableId)
        : (table.seats || []).some(s => s && s.userId === userId);
      if (!seated) {
        return `
          <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-8 max-w-2xl mx-auto text-center">
            <div class="text-5xl mb-4">🪑</div>
            <div class="text-white font-black text-2xl uppercase tracking-widest">Seat Required</div>
            <div class="text-rcSlateLight text-sm mt-3">Players cannot watch the table without taking a seat. Go to the lobby and sit to enter.</div>
            <button onclick="window.navigateTo('smart_lobby')" class="mt-6 poker-chip-btn px-6 py-3 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">Back to Lobby</button>
          </div>
        `;
      }
    }

    const closedBanner = (site.scheduleEnabled && !site.siteOpenNow) ? (function(){
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'TBD';
      const userTz = (Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'local') : 'local';
      const closingPending = !!((table.hand || {}).inProgress);
      return `
        <div class="mb-6 bg-rcRed/10 border border-rcRed/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <div class="text-rcRed font-black uppercase tracking-widest text-[10px]">Table Closed</div>
            <div class="text-white text-sm font-bold mt-1">Next open: <span class="text-rcGold font-mono">${when}</span></div>
            <div class="text-rcSlateLight text-[10px] mt-1">Your timezone: ${escapeHtml(userTz)} • ${closingPending ? 'Closing after the current hand ends.' : 'Closed now.'} No new hand will start while closed.</div>
          </div>
          <button onclick="window.navigateTo('smart_lobby')" class="bg-rcNavyBase border border-rcGold/20 text-rcGold px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rcGold hover:text-rcNavyBase transition-all">Lobby</button>
        </div>
      `;
    })() : '';

    const seatedCount = store.countSeatedPlayers(table);
    const seatLabel = seatedCount > 4 ? 'SIT HERE' : 'ACQUIRE';

    // Render seats
    let seatsHtml = '';
    for (let i = 0; i < table.maxPlayers; i++) {
      const seat = table.seats[i];
      if (!seat || !seat.userId) seatsHtml += renderSeatEmpty(i, r, seatLabel);
      else seatsHtml += renderSeatOccupied(i, seat, r, table.id);
    }

    const head = `
      <div class="flex items-end justify-between mb-6">
        <div>
          <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Table</div>
          <div class="text-white font-black text-4xl mt-2">${escapeHtml(table.name)}</div>
          <div class="text-rcSlateLight text-sm mt-2">Blinds: <span class="text-white font-mono">SB ${(table.blinds||{}).sb || 1} • BB ${(table.blinds||{}).bb || 2}</span> • No Buy-In • No Platform Fees</div>
        </div>
        <div class="flex gap-3">
          <button onclick="window.navigateTo('smart_lobby')" class="bg-rcNavyPanel border border-rcNavyBorder text-rcSlateLight hover:text-white px-5 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Lobby</button>
          ${['admin','root'].includes(r) ? `<button onclick="window.simulateTableHand()" class="bg-rcNavyBase border border-rcGold/30 text-rcGold hover:bg-rcGold hover:text-rcNavyBase px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Simulate Hand</button>` : ''}
        </div>
      </div>
    `;

    const tableCanvas = `
      <div class="relative w-full max-w-6xl mx-auto">
        <div class="relative w-full h-[560px] md:h-[640px] rounded-[48px] bg-gradient-to-b from-[#0d3d30]/40 to-[#061423]/90 border border-rcGold/25 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
          <div class="absolute inset-6 rounded-[40px] border border-rcGold/15 bg-black/10"></div>

          ${renderDealFlyOverlay(table)}

          ${renderTableCenter(table, r)}
          ${seatsHtml}

          <div class="absolute top-4 left-4 bg-black/30 border border-rcNavyBorder rounded-2xl px-4 py-2">
            <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Players</div>
            <div class="text-white font-mono font-black text-lg">${seatedCount}/${table.maxPlayers}</div>
          </div>

          <div class="absolute top-4 right-4 bg-black/30 border border-rcNavyBorder rounded-2xl px-4 py-2">
            <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Waiting</div>
            <div class="text-white font-mono font-black text-lg">${(table.waiting||[]).length}</div>
          </div>

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/30 border border-rcGold/20 rounded-full px-5 py-2">
            <div class="text-[10px] text-rcGold font-black uppercase tracking-widest">${isStaff(r) ? 'Spectator / Staff view' : (r === 'player' ? 'Click an empty seat to auto buy-in' : 'Observe mode')}</div>
          </div>
        </div>

        ${renderGodViewPanel(table, r)}

        <div id="table_intel_container">
          ${renderIntelPanel(table, r)}
        </div>
      </div>
    `;

    return `<div class="w-full">${closedBanner}${head}${tableCanvas}</div>`;
  };

  // -------------------- styles --------------------
  if (!document.getElementById('royal-table-v7-styles')) {
    const style = document.createElement('style');
    style.id = 'royal-table-v7-styles';
    style.textContent = `
      .deal-in { animation: dealIn 380ms ease-out both; }
      .deal-delay-0 { animation-delay: 0ms; }
      .deal-delay-1 { animation-delay: 70ms; }
      .deal-delay-2 { animation-delay: 140ms; }
      .deal-delay-3 { animation-delay: 210ms; }
      .deal-delay-4 { animation-delay: 280ms; }
      @keyframes dealIn {
        from { transform: translateY(-10px) scale(0.98); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      .deal-fly-cine {
        width: 40px; height: 56px;
        border-radius: 10px;
        background: radial-gradient(circle at 30% 20%, rgba(212,175,55,0.18), transparent 45%), linear-gradient(145deg, rgba(11,34,58,0.98), rgba(6,20,35,0.98));
        border: 1px solid rgba(212,175,55,0.35);
        box-shadow: 0 14px 30px rgba(0,0,0,0.65);
        position: relative;
        animation: dealFlyCine 920ms cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: center; will-change: transform, opacity, filter;
      }
      .deal-fly-cine::after {
        content: "♛";
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(212,175,55,0.75);
        font-size: 20px;
        opacity: 0.9;
      }
      @keyframes dealFlyCine {
        0%   { transform: translate(var(--fromX), var(--fromY)) rotate(-22deg) scale(0.22); opacity: 0; filter: blur(1.6px); }
        12%  { opacity: 1; }
        55%  { transform: translate(calc(var(--fromX) * 0.35), calc(var(--fromY) * 0.35 - 70px)) rotate(-8deg) scale(0.78); opacity: 1; filter: blur(0.5px); }
        82%  { transform: translate(0, 0) rotate(2deg) scale(1.04); opacity: 1; filter: blur(0px); }
        100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0; filter: blur(0px); }
      }

      .winner-overlay {
        position: fixed; inset: 0; background: rgba(6,20,35,0.92);
        display: flex; align-items: center; justify-content: center;
        z-index: 99998; opacity: 0; pointer-events: none;
        transition: opacity 250ms ease;
      }
      .winner-overlay.show { opacity: 1; pointer-events: auto; }
      .winner-card {
        width: min(520px, 92vw);
        background: linear-gradient(145deg, rgba(11,34,58,0.92), rgba(4,15,26,0.98));
        border: 1px solid rgba(212,175,55,0.25);
        border-radius: 28px;
        padding: 32px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.85), inset 0 0 40px rgba(0,0,0,0.6);
        transform: translateY(8px) scale(0.98);
        animation: popWin 240ms ease-out both;
      }
      @keyframes popWin {
        to { transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
})();
