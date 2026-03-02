/**
 * ==========================================
 * ROYAL - LIVE PULSE (Mock Realtime Engine)
 * ==========================================
 * Makes the mockup feel like a live production site:
 * - Heartbeat indicator (latency)
 * - Small random finance ticks (USD/ILS)
 * - Optional auto-hand simulation when table is active
 * - Lightweight activity feed events
 */

(function(){
  function rand(min, max){ return Math.random() * (max - min) + min; }

  function tickUsdIls(){
    try{
      const store = window.ROYAL_STORE;
      if(!store) return;
      const cfg = store.loadConfig();
      const cur = Number(cfg.usdIls || 3.60);
      const next = Math.max(2.5, Math.min(6.5, cur + rand(-0.005, 0.005)));
      cfg.usdIls = Number(next.toFixed(4));
      store.saveConfig(cfg);
    }catch(_){}
  }

  function heartbeat(){
    const el = document.getElementById('rcLiveLatency');
    const dot = document.getElementById('rcLiveDot');
    if(!el || !dot) return;
    const ms = Math.floor(rand(18, 140));
    el.textContent = `${ms}ms`;
    dot.style.opacity = ms > 110 ? '0.55' : '1';
  }

  function trySimulateHand(){
    try{
      const store = window.ROYAL_STORE;
      if(!store) return;
      const tables = store.listTables();
      if(!tables || !tables.length) return;
      const t = tables[0];
      const seated = store.countSeatedPlayers(t);
      // Auto-seat from waiting lounge (FIFO) when a seat becomes available
      try{ store.autoSeatFromWaiting && store.autoSeatFromWaiting(t.id); }catch(_){ }

      // Progress an ongoing hand (even when the table is closed) – "finish the last round".
      try{ store.tickHands && store.tickHands(t.id); }catch(_){ }

      // Start a new hand only when at least 2 players are seated AND the table is open.
      const site = store.getSiteStatus ? store.getSiteStatus() : { siteOpenNow: true };
      if(seated >= 2 && site.siteOpenNow){
        // 20% chance per tick
        if(Math.random() < 0.20){
          store.simulateHand(t.id);
          if(window.forceRerender) window.forceRerender();
        }
      }    }catch(_){}
  }

  function updateClock(){
    const el = document.getElementById('rcLiveClock');
    if(!el) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    el.textContent = `${hh}:${mm}:${ss}`;
  }

  // Start loops
  setInterval(heartbeat, 900);
  setInterval(updateClock, 250);
  setInterval(tickUsdIls, 4000);
  setInterval(trySimulateHand, 2500);
})();
