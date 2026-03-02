/**
 * ==========================================
 * ROYAL - PLAYER DASHBOARD (V3.0)
 * ==========================================
 * Focus: Wallet, Buy CROWN, Withdraw Requests, History, ${t('playerDash.docs')}.
 */

(function () {
  function getStore() {
    return window.ROYAL_STORE;
  }

  function role(stateObj) {
    return String(stateObj.role || stateObj.activeRole || 'guest').toLowerCase();
  }

  function fmt(n, d = 2) {
    const x = Number(n || 0);
    if (!Number.isFinite(x)) return '0';
    if (window.formatNumber) return window.formatNumber(x, { minimumFractionDigits: d, maximumFractionDigits: d });
    return x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function canShowWithdraw(cfg, bal) {
    return !!cfg.withdrawalsActive && Number(bal || 0) >= Number(cfg.withdrawButtonMinCrown || 50);
  }

  window.renderPlayerDashboard = function (stateObj) {
    const t = window.t || ((k)=>k);
    const r = role(stateObj);
    if (r !== 'player') {
      return `
        <div class="poker-auth-card p-10 rounded-3xl max-w-2xl mx-auto border border-rcRed/30 text-center">
          <div class="text-5xl mb-6">🚫</div>
          <div class="text-white font-black text-2xl uppercase tracking-widest">${t('playerDash.playerDashboardTitle')}</div>
          <div class="text-rcSlateLight text-sm mt-3">${t('playerDash.playerDashboardHint')}</div>
        </div>
      `;
    }

    const store = getStore();
    const uid = (stateObj.user || {}).id;
    const user = uid ? store.getUserById(uid) : null;
    const cfg = store.loadConfig();

    const bal = user ? user.balanceCrown : Number((stateObj.user || {}).balance || 0);
    const reserved = uid ? store.getReservedCrown(uid) : 0;
    const available = uid ? store.getAvailableCrown(uid) : bal;

    // No promos / locks

    const withdrawVisible = canShowWithdraw(cfg, bal);

    const deposits = store.loadDeposits().filter(d => d.userId === uid).slice(0, 5);
    const withdrawals = store.loadWithdrawals().filter(w => w.userId === uid).slice(0, 8);
    const ledger = store.loadLedger().filter(l => l.userId === uid).slice(0, 12);

    return `
      <div class="max-w-6xl mx-auto fade-in">
        <div class="flex items-end justify-between mb-8">
          <div>
            <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.playerCommand')}</div>
            <div class="text-white font-black text-4xl mt-2">${t('playerDash.walletSessions')}</div>
            <div class="text-rcSlateLight text-sm mt-2">${t('playerDash.playerSubtitle')}</div>
          </div>
          <div class="flex gap-3">
            <button onclick="window.openUserSettings()" class="bg-rcNavyPanel border border-rcNavyBorder text-rcSlateLight hover:text-white px-5 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-widest">${t('playerDash.profileBtn')}</button>
            <button onclick="window.navigateTo('smart_lobby')" class="poker-chip-btn px-5 py-3 rounded-2xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">${t('playerDash.lobbyBtn')}</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 shadow-inner">
            <div class="text-[10px] text-rcSlate uppercase tracking-widest font-bold">${t('playerDash.balance')}</div>
            <div class="text-rcGold font-mono font-black text-3xl mt-2">${fmt(bal, 2)} CROWN</div>
            <div class="text-rcSlateLight text-xs mt-3">${t('playerDash.valueModel')} 1 CROWN = $${fmt(cfg.crownUsdRate, 2)}</div>
          </div>
          <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 shadow-inner">
            <div class="text-[10px] text-rcSlate uppercase tracking-widest font-bold">${t('playerDash.available')}</div>
            <div class="text-white font-mono font-black text-3xl mt-2">${fmt(available, 2)} CROWN</div>
            <div class="text-rcSlateLight text-xs mt-3">${t('playerDash.reserved')} ${fmt(reserved, 2)} CROWN</div>
          </div>
          <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 shadow-inner">
            <div class="text-[10px] text-rcSlate uppercase tracking-widest font-bold">${t('playerDash.withdrawals')}</div>
            <div class="text-${cfg.withdrawalsActive ? 'rcGreen' : 'rcRed'} font-black uppercase tracking-widest text-sm mt-2">${cfg.withdrawalsActive ? t('playerDash.active') : t('playerDash.disabled')}</div>
            <div class="text-rcSlateLight text-xs mt-3">${t('playerDash.withdrawRulesLine',{minShow:Number(cfg.withdrawButtonMinCrown || 50), minReq:Number(cfg.withdrawRequestMinCrown || 50)})}</div>
  <div class="text-rcSlateLight text-xs mt-2">⚠️ ${t('playerDash.withdrawAfterHand')}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('checkout.buyCrown')}</div>
                  <div class="text-white font-black text-2xl mt-2">${t('checkout.cryptoCheckout')}</div>
                  <div class="text-rcSlateLight text-sm mt-2">${t('playerDash.buySubtitle')}</div>
                </div>
                <button onclick="(window.openCryptoCheckoutModal?window.openCryptoCheckoutModal():window.navigateTo('crypto_checkout'))" class="poker-chip-btn px-6 py-3 rounded-2xl text-rcNavyBase font-black uppercase tracking-widest text-[10px]">${t('playerDash.openCheckout')}</button>
              </div>
              <div class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-5">
                <div class="text-white font-bold">${t('playerDash.noPromosLine')}</div>
                <div class="text-rcSlateLight text-xs mt-2">${t('playerDash.onlyNetworkFee')}</div>
              </div>
            </div>

            ${withdrawVisible ? renderWithdrawPanel(cfg, user, withdrawals) : renderWithdrawLocked(cfg, bal)}

            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.recentLedger')}</div>
                  <div class="text-white font-black text-2xl mt-2">${t('playerDash.activity')}</div>
                </div>
                <button onclick="window.openDocumentModal('terms')" class="bg-rcNavyBase border border-rcNavyBorder text-rcSlateLight hover:text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]">${t('playerDash.rules')}</button>
              </div>
              ${renderLedger(ledger)}
            </div>
          </div>

          <div class="space-y-8">
            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.docs')}</div>
              <div class="text-white font-black text-2xl mt-2">${t('playerDash.knowledgeBase')}</div>
              <div class="grid grid-cols-1 gap-3 mt-6">
                <button onclick="window.openDocumentModal('wallets')" class="doc-btn">${t('docs.wallets')}</button>
                <button onclick="window.openDocumentModal('buy_crown')" class="doc-btn">${t('docs.buyCrown')}</button>
                <button onclick="window.openDocumentModal('convert')" class="doc-btn">${t('docs.convert')}</button>
                <button onclick="window.openDocumentModal('privacy')" class="doc-btn">${t('docs.privacy')}</button>
                <button onclick="window.openDocumentModal('terms')" class="doc-btn">${t('docs.terms')}</button>
                <button onclick="window.openDocumentModal('refunds')" class="doc-btn">${t('docs.refunds')}</button>
              </div>
            </div>

            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.recentDeposits')}</div>
              <div class="text-white font-black text-2xl mt-2">${t('playerDash.invoices')}</div>
              ${renderDeposits(deposits)}
            </div>

            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.quickLinks')}</div>
              <div class="grid grid-cols-1 gap-3 mt-6">
                <button onclick="window.navigateTo('poker_table')" class="doc-btn">${t('playerDash.openTable')}</button>
                <button onclick="window.navigateTo('waiting_lounge')" class="doc-btn">${t('playerDash.waitingLounge')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  function renderWithdrawLocked(cfg, bal) {
    const minShow = Number(cfg.withdrawButtonMinCrown || 50);
    return `
      <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
        <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.withdraw')}</div>
        <div class="text-white font-black text-2xl mt-2">${t('playerDash.unavailable')}</div>
        <div class="text-rcSlateLight text-sm mt-3">${t('playerDash.withdrawShownOnly',{minShow: minShow})}</div>
        <div class="mt-6 bg-rcNavyBase border border-rcNavyBorder p-5 rounded-2xl">
          <div class="text-rcSlateLight text-xs">${t('playerDash.yourBalance')}</div>
          <div class="text-white font-mono font-black text-2xl">${fmt(bal, 2)} CROWN</div>
        </div>
      </div>
    `;
  }

  function renderWithdrawPanel(cfg, user, withdrawals) {
    const minReq = Number(cfg.withdrawRequestMinCrown || 50);
    return `
      <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-8 shadow-inner">
        <div class="flex items-start justify-between">
          <div>
            <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.withdraw')}</div>
            <div class="text-white font-black text-2xl mt-2">${t('playerDash.convertToUSDT')}</div>
            <div class="text-rcSlateLight text-sm mt-2">${t('playerDash.withdrawFormDesc')}</div>
          </div>
          <button onclick="window.openDocumentModal('convert')" class="bg-rcNavyBase border border-rcGold/20 text-rcGold px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rcGold hover:text-rcNavyBase transition-all">${t('playerDash.howItWorks')}</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${t('playerDash.amountCrown')}</label>
            <input id="wd_amount" type="number" min="0" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="${t('playerDash.minimum',{minReq: minReq})}">
            <div class="text-[10px] text-rcSlateLight mt-2">${t('playerDash.available')}: <span class="text-white font-mono">${fmt((user ? user.balanceCrown : 0), 2)} CROWN</span></div>
          </div>
          <div>
            <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${t('playerDash.network')}</label>
            <select id="wd_network" class="mt-2 w-full bg-rcNavyBase border border-rcNavyBorder text-white p-3 rounded-xl text-sm">
              <option value="TRC20">TRC20</option>
              <option value="ERC20">ERC20</option>
                          </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${t('playerDash.usdtAddress')}</label>
            <input id="wd_address" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="${t('playerDash.pasteAddress')}">
          </div>
        </div>

        <div class="mt-6 bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-5">
          <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.feeQuote')}</div>
          <div id="wd_quote" class="text-rcSlateLight text-sm mt-3">${t('playerDash.feeQuoteHint')}</div>
          <div class="mt-4 flex gap-3">
            <button onclick="window.quoteWithdrawal()" class="bg-rcNavyPanel border border-rcGold/20 text-rcGold px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rcGold hover:text-rcNavyBase transition-all">${t('playerDash.quote')}</button>
            <button onclick="window.submitWithdrawalRequest()" class="bg-rcRed text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-all">${t('playerDash.submitRequest')}</button>
          </div>
          <div id="wd_error" class="text-rcRed text-[10px] font-black uppercase tracking-widest mt-4"></div>
        </div>

        <div class="mt-8">
          <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('playerDash.requests')}</div>
          <div class="mt-4 space-y-3">${renderWithdrawalList(withdrawals)}</div>
        </div>
      </div>
    `;
  }

  function renderWithdrawalList(items) {
    if (!items.length) {
      return `<div class="text-rcSlateLight text-sm">${t('playerDash.noWithdrawalsYet')}</div>`;
    }

    const statusBadge = (s) => {
      const m = String(s || '').toLowerCase();
      if (m === 'requested') return `<span class="bg-rcGold/10 border border-rcGold/30 text-rcGold px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Requested</span>`;
      if (m === 'paid') return `<span class="bg-rcGreen/10 border border-rcGreen/30 text-rcGreen px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Paid</span>`;
      if (m === 'rejected') return `<span class="bg-rcRed/10 border border-rcRed/30 text-rcRed px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Rejected</span>`;
      if (m === 'paid') return `<span class="bg-rcGreen/10 border border-rcGreen/30 text-rcGreen px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Paid</span>`;
      return `<span class="bg-rcNavyBase border border-rcNavyBorder text-rcSlate px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">${escapeHtml(m)}</span>`;
    };

    return items.map(w => {
      return `
        <div class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-white font-bold">${fmt(w.amountCrown, 2)} CROWN → ${fmt((w.quote||{}).netUSDT, 2)} USDT</div>
              <div class="text-rcSlateLight text-xs mt-1">Network: <span class="text-white font-mono">${escapeHtml(w.network)}</span> • Created: ${escapeHtml(new Date(w.createdAt).toLocaleString())}</div>
              ${w.adminNote ? `<div class="text-rcSlateLight text-xs mt-2">Admin note: <span class="text-white">${escapeHtml(w.adminNote)}</span></div>` : ''}
              ${w.paidTxid ? `<div class="text-rcSlateLight text-xs mt-1">TXID: <span class="text-white font-mono">${escapeHtml(w.paidTxid)}</span></div>` : ''}
            </div>
            <div>${statusBadge(w.status)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDeposits(items) {
    if (!items.length) {
      return `<div class="text-rcSlateLight text-sm mt-6">No invoices yet.</div>`;
    }

    const badge = (s) => {
      const m = String(s||'').toLowerCase();
      if (m === 'finished') return `<span class="bg-rcGreen/10 border border-rcGreen/30 text-rcGreen px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Finished</span>`;
      if (m === 'confirming') return `<span class="bg-rcGold/10 border border-rcGold/30 text-rcGold px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Confirming</span>`;
      return `<span class="bg-rcNavyBase border border-rcNavyBorder text-rcSlate px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">${escapeHtml(m)}</span>`;
    };

    return `<div class="mt-6 space-y-3">${items.map(d => `
      <div class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-4">
        <div class="flex justify-between items-start gap-4">
          <div>
            <div class="text-white font-bold">${escapeHtml(d.mode)} • ${fmt(d.crownsToCredit, 2)} CROWN</div>
            <div class="text-rcSlateLight text-xs mt-1">USDT: <span class="text-white font-mono">${fmt(d.usdtToSend, 2)}</span> • Confirmations: ${d.confirmations}/${d.requiredConfirmations}</div>
          </div>
          <div>${badge(d.status)}</div>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderLedger(items) {
    if (!items.length) return `<div class="text-rcSlateLight text-sm">No activity yet.</div>`;

    return `<div class="space-y-3">${items.map(l => `
      <div class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-white font-bold">${escapeHtml(l.type)}</div>
            <div class="text-rcSlateLight text-xs mt-1">${escapeHtml(new Date(l.at).toLocaleString())} • ${escapeHtml(l.note || '')}</div>
          </div>
          <div class="text-right">
            ${Number(l.deltaCrown||0) ? `<div class="font-mono font-black ${Number(l.deltaCrown) >= 0 ? 'text-rcGreen' : 'text-rcRed'}">${Number(l.deltaCrown) >= 0 ? '+' : ''}${fmt(l.deltaCrown, 2)} CR</div>` : ''}
            ${Number(l.deltaUSDT||0) ? `<div class="text-rcSlateLight text-xs font-mono">${Number(l.deltaUSDT) >= 0 ? '+' : ''}${fmt(l.deltaUSDT, 2)} USDT</div>` : ''}
          </div>
        </div>
      </div>
    `).join('')}</div>`;
  }

  window.quoteWithdrawal = function () {
    const store = getStore();
    const uid = (window.APP_STATE.user || {}).id;
    if (!store || !uid) return;

    const amount = Number((document.getElementById('wd_amount') || {}).value || 0);
    const network = (document.getElementById('wd_network') || {}).value || 'TRC20';

    try {
      const q = store.quoteWithdrawal({ userId: uid, amountCrown: amount, network });
      const el = document.getElementById('wd_quote');
      const err = document.getElementById('wd_error');
      if (err) err.textContent = '';
      if (el) {
        el.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
            <div class="bg-black/20 border border-rcNavyBorder rounded-xl p-4">
              <div class="text-rcSlateLight text-xs">Gross</div>
              <div class="text-white font-mono font-black text-xl">${fmt(q.grossUSDT, 2)} USDT</div>
              <div class="text-rcSlateLight text-xs mt-2">Rate</div>
              <div class="text-white font-mono">1 CROWN = $${fmt(q.crownUsdRate, 2)}</div>
            </div>
            <div class="bg-black/20 border border-rcNavyBorder rounded-xl p-4">
              <div class="text-rcSlateLight text-xs">Fees</div>
              <div class="text-white font-mono font-black text-xl">${fmt(q.totalFeeUSDT, 2)} USDT</div>
              <div class="text-rcSlateLight text-xs mt-2">Total fee pct (cap 5%)</div>
              <div class="text-rcGold font-mono font-black">${fmt(q.totalFeePct, 2)}%</div>
            </div>
          </div>
          <div class="mt-4 bg-rcNavyPanel border border-rcGold/20 rounded-xl p-4">
            <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Net payout</div>
            <div class="text-white font-mono font-black text-2xl mt-2">${fmt(q.netUSDT, 2)} USDT</div>
            <div class="text-rcSlateLight text-xs mt-2">Network fee estimate: ${fmt(q.networkFeeUSDT, 2)} USDT</div>
          </div>
        `;
      }
    } catch (e) {
      const err = document.getElementById('wd_error');
      if (err) err.textContent = String(e.message || e);
    }
  };

  window.submitWithdrawalRequest = function () {
    const store = getStore();
    const uid = (window.APP_STATE.user || {}).id;
    if (!store || !uid) return;

    const amount = Number((document.getElementById('wd_amount') || {}).value || 0);
    const network = (document.getElementById('wd_network') || {}).value || 'TRC20';
    const address = (document.getElementById('wd_address') || {}).value || '';

    try {
      store.createWithdrawalRequest({ userId: uid, amountCrown: amount, network, address });
      const u = store.getUserById(uid);
      if (u) window.APP_STATE.user.balance = u.balanceCrown;
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      const err = document.getElementById('wd_error');
      if (err) err.textContent = String(e.message || e);
    }
  };

  function msToMMSS(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // button style
  if (!document.getElementById('doc-btn-style')) {
    const st = document.createElement('style');
    st.id = 'doc-btn-style';
    st.textContent = `
      .doc-btn{background:rgba(0,0,0,0.2);border:1px solid #1a365d;color:#94a3b8;padding:12px 14px;border-radius:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.16em;font-size:10px;transition:all .2s}
      .doc-btn:hover{border-color:rgba(212,175,55,0.6);color:#fff;transform:translateY(-1px)}
    `;
    document.head.appendChild(st);
  }
})();