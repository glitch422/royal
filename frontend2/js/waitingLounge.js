/**
 * ==========================================
 * ROYAL - WAITING LOUNGE (V2.0)
 * ==========================================
 * Backed by ROYAL_STORE tables.waiting.
 *
 * Requirements implemented:
 * - Simulate 3 players in waiting lounge (seeded in store)
 * - Staff can enter the lounge without being counted
 * - Players can leave the queue at any time
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

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function avatarFor(user) {
    if (window.ROYAL_AVATARS && window.ROYAL_AVATARS.avatarPathForUser) return window.ROYAL_AVATARS.avatarPathForUser(user);
    return 'assets/avatars/player1.jpeg';
  }

  window.renderWaitingLounge = function (stateObj) {
    const t = window.t || ((k)=>k);
    const fmt = window.formatNumber || ((n)=>Number(n||0).toLocaleString());
    const store = getStore();
    const r = role(stateObj);
    const tableId = (stateObj.ui && stateObj.ui.activeTableId) ? stateObj.ui.activeTableId : 'tbl_omega';
    const table = store ? store.getTableById(tableId) : null;

    if (!table) {
      return `
        <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 max-w-2xl mx-auto">
          <div class="text-rcRed font-black uppercase tracking-widest">${t('waiting.unavailableTitle')}</div>
          <div class="text-rcSlateLight text-sm mt-2">${t('waiting.noTable')}</div>
          <button onclick="window.navigateTo('smart_lobby')" class="mt-6 poker-chip-btn px-6 py-3 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">${t('waiting.backToLobby')}</button>
        </div>
      `;
    }

    const waiting = (table.waiting || []).map(id => store.getUserById(id)).filter(Boolean);

    const required = 4;
    const current = waiting.length;
    const progress = Math.min(100, (current / required) * 100);

    const myId = (stateObj.user || {}).id;
    const inQueue = !!waiting.find(u => u.id === myId);

    const canExit = true;

    const peerHtml = new Array(required).fill(null).map((_, i) => {
      const p = waiting[i];
      if (!p) {
        return `
          <div class="flex flex-col items-center justify-center p-3 bg-rcNavyBase/40 border border-dashed border-rcNavyBorder rounded-xl h-full min-h-[110px]">
            <div class="w-8 h-8 border-2 border-rcNavyBorder border-t-rcGold rounded-full animate-spin mb-2 opacity-50"></div>
            <span class="text-[8px] text-rcSlateLight uppercase tracking-widest font-bold text-center">${t('waiting.scanning')}</span>
          </div>
        `;
      }
      return `
        <div class="flex flex-col items-center justify-center p-3 bg-rcNavyBase/80 border border-rcGold/30 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <img src="${avatarFor(p)}" class="w-12 h-12 rounded-full border-2 border-rcNavyBorder object-cover mb-2">
          <span class="text-[10px] text-white font-bold tracking-widest uppercase">@${escapeHtml(p.username)}</span>
          <span class="text-[8px] text-rcSlateLight">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</span>
        </div>
      `;
    }).join('');

    const staffHint = isStaff(r) ? `
      <div class="bg-rcNavyBase border border-rcGold/20 p-4 rounded-2xl">
        <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('waiting.staffAccess')}</div>
        <div class="text-rcSlateLight text-xs mt-2">${t('waiting.staffAccessBody')}</div>
      </div>
    ` : '';

    const actions = (r === 'player' && inQueue) ? `
      <button onclick="window.exitWaitingQueue('${tableId}')" class="flex-1 bg-rcNavyPanel border border-rcRed/50 text-rcRed hover:bg-rcRed hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] transition-all ${canExit ? '' : 'opacity-40 cursor-not-allowed'}">
        ${t('waiting.revokeExit')}
      </button>
      <button onclick="window.navigateTo('poker_table')" class="flex-1 bg-rcNavyPanel border border-rcGold/30 text-rcGold hover:bg-rcGold hover:text-rcNavyBase font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] transition-all">
        ${t('waiting.observeTable')}
      </button>
      
    ` : `
      <button onclick="window.navigateTo('smart_lobby')" class="flex-1 bg-rcNavyPanel border border-rcGold/30 text-rcGold hover:bg-rcGold hover:text-rcNavyBase font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] transition-all">
        ${t('waiting.backToLobby')}
      </button>
      <button onclick="window.navigateTo('poker_table')" class="flex-1 bg-rcNavyPanel border border-rcGold/30 text-rcGold hover:bg-rcGold hover:text-rcNavyBase font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] transition-all">
        ${t('waiting.observeTable')}
      </button>
    `;

    return `
      <div class="fixed inset-0 bg-rcNavyBase/95 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-4 fade-in font-sans">
        <div class="glass-panel p-6 md:p-8 rounded-3xl max-w-[1000px] w-full border border-rcGold/30 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] max-h-[85vh]">

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 h-full overflow-hidden">
            <div class="col-span-1 lg:col-span-2 flex flex-col h-full">
              <div class="mb-6 flex justify-between items-center shrink-0">
                <div>
                  <span class="text-[10px] text-rcGold uppercase font-black tracking-widest block mb-1">${t('waiting.title')}</span>
                  <h2 class="text-white font-black text-3xl uppercase tracking-widest">${escapeHtml(table.name)}</h2>
                  <div class="text-rcSlateLight text-xs mt-2">${t('waiting.seatsFillAuto')}</div>
                </div>
                <div class="bg-rcNavyPanel border border-rcNavyBorder px-3 py-1.5 rounded-lg flex flex-col items-end shadow-inner">
                  <span class="text-[8px] text-rcSlate uppercase font-bold tracking-widest"></span>
                  <span class="text-white text-xs font-mono font-bold">${table.Crown} CROWN</span>
                </div>
              </div>

              <div class="w-full bg-rcNavyBase rounded-full h-2 mb-2 border border-rcNavyBorder overflow-hidden shrink-0">
                <div class="bg-rcGold h-2 rounded-full transition-all duration-1000 ease-in-out" style="width:${progress}%;"></div>
              </div>

              <div class="w-full flex justify-between items-center mb-6 shrink-0">
                <span class="text-[10px] text-rcSlateLight uppercase font-bold tracking-widest">${t('waiting.capacityThreshold')}</span>
                <span class="text-white font-mono font-bold text-sm bg-rcNavyBase px-3 py-1 rounded-md border border-rcNavyBorder">${fmt(current)} / ${fmt(required)}</span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full shrink-0">${peerHtml}</div>

              <div class="w-full flex gap-3 mt-6 shrink-0">${actions}</div>
            </div>

            <div class="col-span-1 flex flex-col gap-6">
              ${staffHint}
              <div class="bg-rcNavyBase/50 border border-rcNavyBorder rounded-2xl p-4 flex flex-col shadow-inner">
                <span class="text-[10px] text-rcGold font-black uppercase tracking-widest mb-4 block border-b border-rcNavyBorder pb-2">${t('waiting.queueIntel')}</span>
                <div class="space-y-4">
                  <div>
                    <span class="text-[8px] text-rcSlate uppercase font-bold block mb-1">${t('waiting.yourPosition')}</span>
                    <span class="text-white font-mono text-lg font-black">${inQueue ? fmt(waiting.findIndex(u => u.id === myId) + 1) : '–'}</span>
                  </div>
                  <div class="p-3 bg-rcNavyPanel/50 rounded-lg border border-rcNavyBorder text-[10px] text-rcSlateLight">
                    ${t('waiting.seatAutoInfo')}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  };

  window.exitWaitingQueue = function (tableId) {
    const store = getStore();
    const uid = (window.APP_STATE.user || {}).id;
    if (!store || !uid) return;
    const tables = store.loadTables();
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx < 0) return;
    tables[idx].waiting = (tables[idx].waiting || []).filter(x => x !== uid);
    store.saveTables(tables);
    window.navigateTo('smart_lobby');
  };
})();
