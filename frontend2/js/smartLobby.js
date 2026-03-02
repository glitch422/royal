/**
 * ==========================================
 * ROYAL - SMART LOBBY (V3.0)
 * ==========================================
 * Single-table lobby backed by ROYAL_STORE.
 *
 * Requirements implemented:
 * - Single table (10 seats, waiting lounge)
 * - Simulated online population (30 players seeded)
 * - Staff (Admin/Root/Support/Admin/Admin) can enter as spectators without being counted
 * - Players use automatic buy-in when taking a seat
 */

(function () {
  function role(stateObj) {
    return String(stateObj.role || stateObj.activeRole || 'guest').toLowerCase();
  }

  function isStaff(r) {
    return ['admin','root'].includes(String(r || '').toLowerCase());
  }

  function getStore() {
    return window.ROYAL_STORE;
  }

  function firstEmptySeat(table) {
    for (let i = 0; i < (table.seats || []).length; i++) {
      const s = table.seats[i];
      if (!s || !s.userId) return i;
    }
    return -1;
  }

  function seatCount(table) {
    return (table.seats || []).filter(s => s && s.userId).length;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.renderSmartLobby = function (stateObj) {
    const t = window.t || ((k)=>k);
    const fmt = window.formatNumber || ((n)=>Number(n||0).toLocaleString());
    const r = role(stateObj);
    const store = getStore();
    const tables = store ? store.listTables() : [];

    const tvl = store ? store.loadConfig().initialSupplyCrown : 0;

    let cards = '';
    for (const t of tables) {
      const seated = seatCount(t);
      const waiting = (t.waiting || []).length;
      const isFull = seated >= t.maxPlayers;

      const vol = (t.id === 'tbl_vip') ? 'VIP' : (t.id === 'tbl_omega' ? 'High' : 'Standard');
      const volColor = vol === 'VIP' ? 'text-rcGold' : (vol === 'High' ? 'text-rcRed' : 'text-rcGreen');

      let action = '';

      if (r === 'guest') {
        action = `<button onclick="window.observeTable('${t.id}')" class="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-rcNavyBase border border-rcNavyBorder text-rcGold hover:border-rcGold transition-all">${t('lobby.observeLobby')}</button>`;
      } else if (isStaff(r)) {
        action = `<button onclick="window.observeTable('${t.id}')" class="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-rcNavyBase border border-rcGold/40 text-rcGold hover:bg-rcGold hover:text-rcNavyBase transition-all">${t('lobby.enterStaff')}</button>`;
      } else {
        // player
        if (isFull) {
          action = `<button onclick="window.joinQueueLounge('${t.id}')" class="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-rcNavyBase border border-rcGold/30 text-rcGold hover:bg-rcGold hover:text-rcNavyBase transition-all">${t('lobby.joinQueue')} (${fmt(waiting)})</button>`;
        } else {
          action = `<button onclick="window.quickJoinTable('${t.id}')" class="poker-chip-btn w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-rcNavyBase">${t('lobby.sitNow')}</button>`;
        }
      }

      cards += `
        <div class="poker-auth-card p-6 rounded-2xl border border-rcNavyBorder hover:border-rcGold/40 transition-all flex flex-col justify-between group">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-rcGold font-black uppercase tracking-widest text-lg group-hover:text-white transition-colors">${escapeHtml(t.name)}</h3>
              <p class="text-rcSlateLight text-[9px] font-mono mt-1 uppercase tracking-tighter">${t('lobby.tableId')}:  ${t.id}</p>
            </div>
            <div class="bg-black/40 px-2 py-1 rounded border border-rcNavyBorder flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${isFull ? 'bg-rcRed' : 'bg-rcGreen animate-pulse'}"></span>
              <span class="text-white text-[10px] font-mono">${seated}/${t.maxPlayers}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6 bg-black/20 p-3 rounded-xl border border-rcNavyBorder/50">
            <div>
              <span class="text-[8px] text-rcSlate uppercase font-bold tracking-widest block mb-1">${t('lobby.blinds')}</span>
              <span class="text-white font-mono text-xs">SB ${((t.blinds||{}).sb)||1} • BB ${((t.blinds||{}).bb)||2} CROWN</span>
            </div>
            <div>
              <span class="text-[8px] text-rcSlate uppercase font-bold tracking-widest block mb-1">${t('lobby.profile')}</span>
              <span class="${volColor} font-black text-[10px] uppercase tracking-tighter">${vol}</span>
            </div>
            </div>

          ${action}
        </div>
      `;
    }

    const guestBanner = (r === 'guest') ? `
      <div class="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50">
        <div class="bg-rcNavyPanel border-2 border-rcRed/50 p-6 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl flex items-center gap-6">
          <div class="text-4xl">🚫</div>
          <div class="flex-grow">
            <h4 class="text-rcRed font-black uppercase text-xs tracking-widest">${t('lobby.observationMode')}</h4>
            <p class="text-white text-[10px] leading-relaxed mt-1">${t('lobby.guestsObserve')}</p>
          </div>
          <button onclick="window.navigateTo('auth_register')" class="bg-rcRed text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-rcRed transition-all shrink-0">${t('lobby.register')}</button>
        </div>
      </div>
    ` : '';

    return `
      <div class="w-full max-w-6xl mx-auto flex flex-col fade-in px-4">
        <div class="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-rcNavyBorder pb-8">
          <div>
            <h2 class="text-white font-black text-4xl uppercase tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">${t('lobby.title')}</h2>
            <p class="text-rcSlateLight text-sm mt-2 font-medium">${t('lobby.subtitle')}</p>
          </div>
          <div class="text-right bg-rcNavyPanel/50 p-4 rounded-2xl border border-rcGold/20 shadow-inner">
            <span class="text-rcSlate uppercase text-[9px] font-bold tracking-[0.2em] block mb-1">${t('lobby.initialSupply')}</span>
            <span class="text-rcGold font-mono font-black text-2xl">${fmt(Number(tvl))} CROWN</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          ${cards}
        </div>

        ${guestBanner}
      </div>
    `;
  };

  window.observeTable = function (tableId) {
    window.APP_STATE.ui = window.APP_STATE.ui || {};
    window.APP_STATE.ui.activeTableId = tableId;
    window.APP_STATE.ui.spectatorMode = true;
    window.navigateTo('poker_table');
  };

  window.joinQueueLounge = function (tableId) {
    window.APP_STATE.ui = window.APP_STATE.ui || {};
    window.APP_STATE.ui.activeTableId = tableId;
    window.APP_STATE.ui.spectatorMode = false;
    window.navigateTo('waiting_lounge');
  };

  window.quickJoinTable = function (tableId) {
    const store = getStore();
    const userId = (window.APP_STATE.user || {}).id;
    if (!store || !userId) {
      window.navigateTo('auth_register');
      return;
    }

    const table = store.getTableById(tableId);
    if (!table) return;

    const seatIndex = firstEmptySeat(table);
    if (seatIndex < 0) {
      window.joinQueueLounge(tableId);
      return;
    }

    try {
      const res = store.seatPlayer({ userId, tableId, seatIndex });
      window.APP_STATE.user.balance = store.getUserById(userId).balanceCrown;
      window.APP_STATE.ui = window.APP_STATE.ui || {};
      window.APP_STATE.ui.activeTableId = tableId;
      window.APP_STATE.ui.spectatorMode = false;
      if (res.queued) {
        window.navigateTo('waiting_lounge');
      } else {
        window.navigateTo('poker_table');
      }
    } catch (e) {
      const msg = String(e.message || e);
      // If insufficient balance, send to checkout and remember target table.
      if (msg.toLowerCase().includes('insufficient')) {
        window.APP_STATE.ui = window.APP_STATE.ui || {};
        window.APP_STATE.ui.pendingJoinTableId = tableId;
        if (window.openCryptoCheckoutModal) { window.openCryptoCheckoutModal(); } else { window.navigateTo('crypto_checkout'); }
      } else {
        alert(msg);
      }
    }
  };
})();
