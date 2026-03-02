/**
 * ==========================================
 * ROYAL - MOCK PERSISTENCE LAYER (V3.2)
 * ==========================================
 * LocalStorage-backed state so the mockup behaves like a real platform.
 *
 * What this store provides:
 * - Users (roles, identity, status, password reset, avatars)
 * - Tables (multi-table seating, stacks, waiting lounge)
 * - Deposits (standard only)
 * - Withdrawals (request → risk approve/reject → Admin pay)
 * - System configuration (withdrawalsActive, fees, minting, rates)
 * - Security / SOC events
 * - Chat (global support chat + per-table chat)
 *
 * Everything is mock and runs entirely in the browser.
 */

(function () {
  const LS = {
    CONFIG: 'royal_config_v3',
    USERS: 'royal_users_v3',
    TABLES: 'royal_tables_v3',
    WITHDRAWALS: 'royal_withdrawals_v3',
    DEPOSITS: 'royal_deposits_v3',
    SECURITY: 'royal_security_events_v3',
    SUPPORT_TICKETS: 'royal_support_tickets_v3',
    GLOBAL_CHAT: 'royal_chat_messages_v3',
    TABLE_CHAT: 'royal_table_chat_v3',
    PROMO_LOCKS: 'royal_promo_locks_v3',
    LEDGER: 'royal_ledger_v3',
    MUTES: 'royal_mutes_v3',
  };

  // -------------------- helpers --------------------
  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch (_) { return fallback; }
  }

  function now() { return Date.now(); }
  function nowIso() { return new Date().toISOString(); }


  function parseHHMM(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const m = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return null;
    return (Number(m[1]) * 60) + Number(m[2]);
  }

  function minutesSinceMidnight(d) {
    return (d.getHours() * 60) + d.getMinutes();
  }

  function isOpenForDay(scheduleDay, mins) {
    if (!scheduleDay || !scheduleDay.enabled) return false;
    const o = parseHHMM(scheduleDay.open);
    const c = parseHHMM(scheduleDay.close);
    if (o === null || c === null) return false;
    if (o === c) return false;
    // If close is after open (same day window)
    if (c > o) return mins >= o && mins < c;
    // Cross-midnight window (e.g. 18:00 → 02:00)
    return mins >= o || mins < c;
  }
  function computeSiteStatus() {
    const cfg = loadConfig();

    // Default: site is open unless schedule is explicitly enabled by Admin/Root
    if (!cfg.scheduleEnabled) {
      return {
        scheduleEnabled: false,
        siteOpenNow: true,
        timezone: cfg.timezone || 'local',
        nextOpenAt: null,
        nextCloseAt: null,
        nextTransition: null,
      };
    }

    const d = new Date();
    const mins = minutesSinceMidnight(d);
    const day = d.getDay(); // 0=Sun ... 6=Sat
    const today = (cfg.weeklySchedule && cfg.weeklySchedule[day]) ? cfg.weeklySchedule[day] : null;

    const openNow = isOpenForDay(today, mins);

    function toDateForDay(offsetDays, minutes) {
      const dd = new Date(d);
      dd.setDate(dd.getDate() + offsetDays);
      dd.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      return dd;
    }

    function findNextOpen() {
      // If closed, find the next open time within the next 7 days
      for (let off = 0; off <= 7; off++) {
        const dayIdx = (day + off) % 7;
        const row = (cfg.weeklySchedule && cfg.weeklySchedule[dayIdx]) ? cfg.weeklySchedule[dayIdx] : null;
        if (!row || !row.enabled) continue;

        const o = parseHHMM(row.open);
        const c = parseHHMM(row.close);
        if (o === null || c === null || o === c) continue;

        if (off === 0) {
          // Today
          if (c > o) {
            if (mins < o) return toDateForDay(0, o);
          } else {
            // Cross-midnight. Closed window is [c, o)
            if (mins >= c && mins < o) return toDateForDay(0, o);
          }
        } else {
          return toDateForDay(off, o);
        }
      }
      return null;
    }

    function computeNextClose() {
      if (!today || !today.enabled) return null;
      const o = parseHHMM(today.open);
      const c = parseHHMM(today.close);
      if (o === null || c === null || o === c) return null;

      if (c > o) {
        // same day close
        return toDateForDay(0, c);
      }

      // cross-midnight close
      if (mins < c) {
        // after midnight part, closes today at c
        return toDateForDay(0, c);
      }
      // before midnight part, closes tomorrow at c
      return toDateForDay(1, c);
    }

    const nextOpen = openNow ? null : findNextOpen();
    const nextClose = openNow ? computeNextClose() : null;

    const nextTransition = nextOpen ? nextOpen.getTime() : (nextClose ? nextClose.getTime() : null);

    return {
      scheduleEnabled: true,
      siteOpenNow: openNow,
      timezone: cfg.timezone || 'local',
      nextOpenAt: nextOpen ? nextOpen.getTime() : null,
      nextCloseAt: nextClose ? nextClose.getTime() : null,
      nextTransition,
    };
  }

  function uid(prefix) {
    const rnd = Math.random().toString(16).slice(2, 10);
    const t = Date.now().toString(16);
    return `${prefix}_${t}_${rnd}`;
  }

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  function pct(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 100) / 100;
  }

  function normalizeRole(r) {
    const role = String(r || '').toLowerCase();
    const allowed = ['guest', 'player', 'admin', 'root'];
    return allowed.includes(role) ? role : 'guest';
  }

  
  function buildDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
    const deck = [];
    for (const suit of suits) {
      for (const value of values) deck.push({ suit, value });
    }
    return deck;
  }

  function mkHand() {
    const deck = buildDeck().sort(() => Math.random() - 0.5);
    return {
      roundId: uid('hand'),
      holeCards: {},         // userId -> [card, card]
      community: [],         // 0..5
      futureBoard: deck,     // shuffled pool used by drawCard()
      potCrown: 0,
      lastWinnerUserId: null,
      lastWinnerAmount: 0,
      lastFinishedAt: null,
    };
  }

  function mkTable(id, name) {
    return {
      id,
      name,
      maxPlayers: 10,
      // Kept for compatibility with existing UI components
      minBuyInCrown: 0,
      blinds: { sb: 1, bb: 2 },
      seats: Array.from({ length: 10 }, () => null),
      waiting: [],
      hand: null,
      dealerIndex: 0,
    };
  }

function getEnums() {
    const BR = (window.BusinessRules || {});
    return {
      withdrawButtonMin: BR.WITHDRAW_BUTTON_MIN_CROWN || 50,
      withdrawRequestMin: BR.WITHDRAW_REQUEST_MIN_CROWN || 50,
      maxWithdrawFeePct: BR.MAX_TOTAL_WITHDRAW_FEE_PCT || 5,
      // 1 CROWN = 1 USD
      defaultCrownUsdRate: BR.DEFAULT_CROWN_USD_RATE || 1,
    };
  }

  // -------------------- load/save primitives --------------------
  function loadConfig() {
    const { defaultCrownUsdRate } = getEnums();
    const cfg = safeParse(localStorage.getItem(LS.CONFIG) || 'null', null);
    if (cfg) {
      // Enforce current build rules (no promos, no table/entry fees, fixed 1:1 value model).
      cfg.crownUsdRate = 1;
      cfg.buyInFeePct = 0;
      cfg.rakePct = 0;
      cfg.promoEnabled = false;
      cfg.promoLockMinutes = 0;
      cfg.promoSpreadNIS = 0;
      cfg.withdrawButtonMinCrown = 50;
      cfg.withdrawRequestMinCrown = 50;
      // Keep max deposit cap if present (0 = unlimited)
      if (cfg.maxDepositPerUserUSDT !== undefined) {
        cfg.maxDepositPerUserUSDT = clamp(cfg.maxDepositPerUserUSDT, 0, 100000000);
      }

      saveConfig(cfg);
      return cfg;
    }

    const initial = {
      withdrawalsActive: true,
      withdrawButtonMinCrown: 50,
      withdrawRequestMinCrown: 50,

      // Economic parameters
      crownUsdRate: defaultCrownUsdRate,
      // No table/entry fees. Only network + conversion fees apply at withdrawal.
      buyInFeePct: 0.0,
      rakePct: 0.0,

      // Withdrawal fees
      withdrawalServicePct: 0.75,
      withdrawalMaxTotalFeePct: 5.0,
      fixedWithdrawalFeeMode: false,
      fixedWithdrawalTotalFeePct: 2.25,
      networkFeesUSDT: { TRC20: 1.5, ERC20: 12.0 },

      // Promos are disabled (standard checkout only)
      promoEnabled: false,
      promoLockMinutes: 0,
      promoSpreadNIS: 0.0,
      usdIls: 3.60,

      // Site schedule (Sunday-to-Sunday). Times are local to selected timezone (mock uses browser time).
      scheduleEnabled: false,
      timezone: 'Asia/Jerusalem',
      weeklySchedule: {
        0: { enabled: true, open: '18:00', close: '02:00' },
        1: { enabled: true, open: '18:00', close: '02:00' },
        2: { enabled: true, open: '18:00', close: '02:00' },
        3: { enabled: true, open: '18:00', close: '02:00' },
        4: { enabled: true, open: '18:00', close: '02:00' },
        5: { enabled: true, open: '18:00', close: '02:00' },
        6: { enabled: true, open: '18:00', close: '02:00' },
      },
      closingGraceHands: 1,

      // Treasury / issuance
      initialSupplyCrown: 90000,
      dailyMintCap: 1000,
      issuanceFrozen: false,
      mintedToday: 0,

      // Ops / security
      blockedIPs: [],
      blockedCountries: [],
    };

    localStorage.setItem(LS.CONFIG, JSON.stringify(initial));
    return initial;
  }

  function saveConfig(cfg) {
    localStorage.setItem(LS.CONFIG, JSON.stringify(cfg));
  }

  function loadUsers() {
    const u = safeParse(localStorage.getItem(LS.USERS) || 'null', null);
    if (u && Array.isArray(u) && u.length) return u;

    // Seed users
    const users = [];

    // Staff
    users.push({
      id: 'usr_root',
      role: 'root',
      username: 'System_Root',
      firstName: 'System',
      lastName: 'Owner',
      status: 'active',
      password: 'root',
      ip: '10.0.0.1',
      avatarKey: 'root',
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      balanceCrown: 0,
      stats: mkStats('root')
    });

    users.push({
      id: 'usr_admin',
      role: 'admin',
      username: 'Admin_Center',
      firstName: 'Ops',
      lastName: 'Admin',
      status: 'active',
      password: 'admin',
      ip: '10.0.0.2',
      avatarKey: 'admin',
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      balanceCrown: 0,
      stats: mkStats('admin')
    });

    // Players (30)
    for (let i = 1; i <= 30; i++) {
      const bal = i === 1 ? 120 : (i === 2 ? 60 : Math.floor(30 + Math.random() * 500));
      users.push({
        id: `usr_p${String(i).padStart(2, '0')}`,
        role: 'player',
        username: `Player_${String(i).padStart(2, '0')}`,
        firstName: `Player`,
        lastName: `#${String(i).padStart(2, '0')}`,
        status: 'active',
        password: 'player',
        ip: `172.16.${Math.floor(i / 10)}.${10 + i}`,
        avatarKey: `player${((i - 1) % 8) + 1}`,
        createdAt: nowIso(),
        lastSeenAt: nowIso(),
        balanceCrown: bal,
        stats: mkStats('player', i)
      });
    }

    localStorage.setItem(LS.USERS, JSON.stringify(users));
    return users;
  }

  function saveUsers(users) {
    localStorage.setItem(LS.USERS, JSON.stringify(users));
  }

  function getUserById(userId) {
    const users = loadUsers();
    return users.find(u => u.id === userId) || null;
  }

  function getUserByUsername(username) {
    const u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    const users = loadUsers();
    return users.find(x => String(x.username || '').toLowerCase() === u) || null;
  }
  // -------------------- public auth --------------------
  function authenticateUser({ username, password }) {
    const u = getUserByUsername(username);
    if (!u) throw new Error('Invalid credentials.');
    if (u.status !== 'active') throw new Error('Account is not active.');
    if (String(u.password || '') !== String(password || '')) throw new Error('Invalid credentials.');
    try { setUserLastSeen(u.id); } catch (_) {}
    return u;
  }

  function publicRegister({ username, password, firstName, lastName }) {
    const uname = String(username || '').trim();
    if (uname.length < 3) throw new Error('Username must be at least 3 characters.');
    if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters.');
    const users = loadUsers();
    if (users.some(u => String(u.username || '').toLowerCase() === uname.toLowerCase())) {
      throw new Error('Username already exists.');
    }

    const playerCount = users.filter(u => u.role === 'player').length;
    const user = {
      id: uid('usr'),
      role: 'player',
      username: uname,
      firstName: String(firstName || '').trim() || 'Player',
      lastName: String(lastName || '').trim() || '',
      status: 'active',
      password: String(password),
      ip: '127.0.0.1',
      avatarKey: `player${(playerCount % 8) + 1}`,
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      balanceCrown: 0,
      stats: mkStats('player', playerCount + 1),
    };

    users.push(user);
    saveUsers(users);
    return user;
  }

  function isUserSeatedAtTable(userId, tableId) {
    const t = getTableById(tableId);
    if (!t || !t.seats) return false;
    return t.seats.some(s => s && s.userId === userId);
  }

  function isUserQueuedForTable(userId, tableId) {
    const t = getTableById(tableId);
    if (!t) return false;
    return Array.isArray(t.waiting) && t.waiting.includes(userId);
  }


  function roleRank(role) {
    const r = normalizeRole(role);
    return (r === 'root') ? 3 : (r === 'admin') ? 2 : (r === 'player') ? 1 : 0;
  }

  function canManageTarget(actorRole, targetRole) {
    const a = normalizeRole(actorRole);
    const t = normalizeRole(targetRole);
    if (a === 'root') return true;
    if (a === 'admin' && t !== 'root') return true;
    return false;
  }

  function createUser(actorRole, { username, password, role, firstName, lastName, balanceCrown }) {
    const actor = normalizeRole(actorRole);
    const desired = normalizeRole(role || 'player');

    if (actor === 'guest' || actor === 'player') throw new Error('Permission denied.');
    if (actor === 'admin' && desired === 'root') throw new Error('Only ROOT can create ROOT users.');

    const users = loadUsers();
    const u = String(username || '').trim();
    if (u.length < 3) throw new Error('Username must be at least 3 characters.');
    if (users.some(x => String(x.username || '').toLowerCase() === u.toLowerCase())) throw new Error('Username already exists.');

    const p = String(password || '').trim();
    if (p.length < 4) throw new Error('Password must be at least 4 characters.');

    const id = uid('usr');
    const newUser = {
      id,
      role: desired,
      username: u,
      firstName: String(firstName||'').trim(),
      lastName: String(lastName||'').trim(),
      status: 'active',
      password: p,
      ip: '0.0.0.0',
      avatarKey: desired === 'admin' ? 'admin' : (desired === 'root' ? 'root' : 'player1'),
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      balanceCrown: pct(Math.max(0, Number(balanceCrown||0))),
      reservedCrown: 0,
      stats: mkStats(desired),
      meta: { hasPlayedHand: false, firstHandAt: null },
    };

    users.unshift(newUser);
    saveUsers(users);
    addLedger({ type: 'USER_CREATED', userId: id, note: `User created by ${actor}`, meta: { role: desired } });
    return newUser;
  }

  function deleteUser(actorRole, userId) {
    const actor = normalizeRole(actorRole);
    if (actor === 'guest' || actor === 'player') throw new Error('Permission denied.');

    const users = loadUsers();
    const target = users.find(u => u.id === userId);
    if (!target) throw new Error('User not found.');
    if (normalizeRole(target.role) === 'root') throw new Error('ROOT user cannot be deleted.');

    if (!canManageTarget(actor, target.role)) throw new Error('Permission denied.');

    const next = users.filter(u => u.id !== userId);
    saveUsers(next);
    addLedger({ type: 'USER_DELETED', userId, note: `User deleted by ${actor}`, meta: { targetRole: target.role } });
    return true;
  }

  function mkStats(kind, seed = 1) {
    if (kind !== 'player') {
      return { hands: 0, vpip: 0, pfr: 0, af: 0, winLoss: 0, depositsUSDT: 0, withdrawalsUSDT: 0, foldStreak: 0, lastActionAt: nowIso() };
    }
    const base = (seed * 73) % 100;
    return {
      hands: 50 + (base * 7),
      vpip: pct(12 + (base % 28)),
      pfr: pct(6 + (base % 18)),
      af: pct(1.2 + ((base % 24) / 10)),
      winLoss: Math.floor((base - 50) * 3),
      depositsUSDT: Math.floor(200 + base * 40),
      withdrawalsUSDT: Math.floor(100 + (base % 60) * 22),
      foldStreak: 0,
      lastActionAt: nowIso(),
    };
  }

  
  // -------------------- SOC / ledger / chat helpers --------------------
  function loadLedger() {
    const l = safeParse(localStorage.getItem(LS.LEDGER) || 'null', null);
    if (l && Array.isArray(l)) return l;
    localStorage.setItem(LS.LEDGER, JSON.stringify([]));
    return [];
  }

  function addLedger(entry) {
    const ledger = loadLedger();
    ledger.unshift({ id: uid('led'), at: nowIso(), ...entry });
    localStorage.setItem(LS.LEDGER, JSON.stringify(ledger.slice(0, 500)));
  }

  function loadSecurityEvents() {
    const s = safeParse(localStorage.getItem(LS.SECURITY) || 'null', null);
    if (s && Array.isArray(s)) return s;
    localStorage.setItem(LS.SECURITY, JSON.stringify([]));
    return [];
  }

  // Promo locks are kept for backward compatibility but promos are disabled in vNext.
  function loadPromoLocks() {
    const s = safeParse(localStorage.getItem(LS.PROMO_LOCKS) || 'null', null);
    if (s && typeof s === 'object') return s;
    localStorage.setItem(LS.PROMO_LOCKS, JSON.stringify({}));
    return {};
  }

  function savePromoLocks(locks) {
    localStorage.setItem(LS.PROMO_LOCKS, JSON.stringify(locks || {}));
  }

  function logSecurity(level, code, message, meta) {
    const events = loadSecurityEvents();
    events.unshift({ id: uid('sec'), at: nowIso(), level, code, message, meta: meta || {} });
    localStorage.setItem(LS.SECURITY, JSON.stringify(events.slice(0, 300)));
  }

  function loadChatMessages() {
    const c = safeParse(localStorage.getItem(LS.GLOBAL_CHAT) || 'null', null);
    if (c && Array.isArray(c)) return c;
    localStorage.setItem(LS.GLOBAL_CHAT, JSON.stringify([]));
    return [];
  }

  function saveChatMessages(msgs) {
    localStorage.setItem(LS.GLOBAL_CHAT, JSON.stringify(Array.isArray(msgs) ? msgs : []));
  }

  function appendChatMessage(msg) {
    const msgs = loadChatMessages();
    msgs.push({ id: uid('msg'), at: nowIso(), ...msg });
    saveChatMessages(msgs.slice(-200));
  }

  function loadTableChatStore() {
    const t = safeParse(localStorage.getItem(LS.TABLE_CHAT) || 'null', null);
    if (t && typeof t === 'object') return t;
    localStorage.setItem(LS.TABLE_CHAT, JSON.stringify({}));
    return {};
  }

  function getTableChat(tableId) {
    const store = loadTableChatStore();
    return (store[tableId] && Array.isArray(store[tableId])) ? store[tableId] : [];
  }

  function appendTableChat(tableId, msg) {
    const store = loadTableChatStore();
    const arr = (store[tableId] && Array.isArray(store[tableId])) ? store[tableId] : [];
    arr.push({ id: uid('tmsg'), at: nowIso(), ...msg });
    store[tableId] = arr.slice(-200);
    localStorage.setItem(LS.TABLE_CHAT, JSON.stringify(store));
  }

  function loadMutes() {
    const m = safeParse(localStorage.getItem(LS.MUTES) || 'null', null);
    if (m && typeof m === 'object') return m;
    localStorage.setItem(LS.MUTES, JSON.stringify({}));
    return {};
  }

  function isMuted(userId) {
    const m = loadMutes();
    const rec = m[userId];
    if (!rec) return { muted:false, remainingMs:0, reason:'' };
    const until = Number(rec.until || 0);
    const remaining = until - Date.now();
    if (remaining <= 0) return { muted:false, remainingMs:0, reason:'' };
    return { muted:true, remainingMs: remaining, reason: String(rec.reason || '') };
  }

  function muteUser(actorRole, tableId, userId, minutes, reason) {
    const actor = normalizeRole(actorRole);
    if (!['admin','root'].includes(actor)) throw new Error('Permission denied.');
    const mins = Math.max(1, Number(minutes || 10));
    const m = loadMutes();
    m[userId] = { until: Date.now() + (mins * 60 * 1000), reason: String(reason || 'Muted') };
    localStorage.setItem(LS.MUTES, JSON.stringify(m));
    appendTableChat(tableId, { fromUserId: 'system', text: `SYSTEM: @${(getUserById(userId)||{}).username || 'player'} muted (${mins}m).` });
  }

  function unmuteUser(actorRole, tableId, userId) {
    const actor = normalizeRole(actorRole);
    if (!['admin','root'].includes(actor)) throw new Error('Permission denied.');
    const m = loadMutes();
    delete m[userId];
    localStorage.setItem(LS.MUTES, JSON.stringify(m));
    appendTableChat(tableId, { fromUserId: 'system', text: `SYSTEM: @${(getUserById(userId)||{}).username || 'player'} unmuted.` });
  }

  function isStaff(role) {
    const r = normalizeRole(role);
    return r === 'admin' || r === 'root';
  }

  function setUserLastSeen(userId) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx].lastSeenAt = nowIso();
      saveUsers(users);
    }
  }

  function listOnlinePlayers() {
    const users = loadUsers().filter(u => u.role === 'player');
    // Mock: show first N as "online"
    return users.slice(0, 8);
  }

  // -------------------- tables helpers --------------------
  function saveTables(tables) {
    localStorage.setItem(LS.TABLES, JSON.stringify(Array.isArray(tables) ? tables : []));
  }

  function listTables() {
    return loadTables();
  }

  function getTableById(tableId) {
    const tables = loadTables();
    return tables.find(t => t.id === tableId) || null;
  }

  function countSeatedPlayers(table) {
    return (table && table.seats) ? table.seats.filter(s => s && s.userId).length : 0;
  }

function loadTables() {
    const t = safeParse(localStorage.getItem(LS.TABLES) || 'null', null);
    if (t && Array.isArray(t) && t.length) return t;

    // Single table (10 seats) + waiting lounge
    const tables = [ mkTable('tbl_main', 'ROYAL Main Table') ];

    // Auto-seat a few fictional players for a live feel (does not affect real users)
    try{
      const users = loadUsers();
      const bots = users.filter(u=>u.role==='player' && /^usr_p\d+/.test(u.id)).slice(0,6);
      const t0 = tables[0];
      bots.forEach((u, i)=>{
        if (!t0.seats[i] || !t0.seats[i].userId) {
          const stack = Math.max(30, Math.min(300, Number(u.balanceCrown || 0) || 100));
          t0.seats[i] = { userId: u.id, stackCrown: stack };
        }
      });

      // Seed an initial hand so the table looks live immediately (for Admin/Root Live Peek and UI).
      t0.hand = mkHand();
      const seatedIds = (t0.seats || []).filter(s => s && s.userId).map(s => s.userId);
      seatedIds.forEach(uid => {
        t0.hand.holeCards[uid] = [drawCard(t0), drawCard(t0)];
      });
      t0.hand.community = [drawCard(t0), drawCard(t0), drawCard(t0), drawCard(t0), drawCard(t0)];
      t0.hand.potCrown = 0;
    }catch(_){ }


    saveTables(tables);
    return tables;
  }

  function updateUserIdentity(actorRole, userId, patch) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];

    const actor = normalizeRole(actorRole);

    // Rules:
    // - Only PLAYER/ADMIN/ROOT can edit their own username + first/last.
    // - Support/Admin must contact admin (cannot self-edit).
    // - Admin/Root can edit other users if permitted.

    const isSelf = !!patch.isSelf;

    if (isSelf) {
      if (!['player', 'admin', 'root'].includes(actor)) {
        throw new Error('This role cannot change identity fields. Contact ADMIN.');
      }
      if (patch.username) {
        const newU = String(patch.username).trim();
        if (newU.length < 3) throw new Error('Username must be at least 3 characters.');
        if (users.some(u => u.id !== userId && String(u.username).toLowerCase() === newU.toLowerCase())) {
          throw new Error('Username already exists.');
        }
        target.username = newU;
      }
      if (patch.firstName) target.firstName = String(patch.firstName).trim();
      if (patch.lastName) target.lastName = String(patch.lastName).trim();
    } else {
      // Editing someone else
      if (!canManageTarget(actorRole, target.role)) throw new Error('Permission denied.');

      if (patch.username) {
        const newU = String(patch.username).trim();
        if (newU.length < 3) throw new Error('Username must be at least 3 characters.');
        if (users.some(u => u.id !== userId && String(u.username).toLowerCase() === newU.toLowerCase())) {
          throw new Error('Username already exists.');
        }
        target.username = newU;
      }
      if (patch.firstName) target.firstName = String(patch.firstName).trim();
      if (patch.lastName) target.lastName = String(patch.lastName).trim();
    }

    saveUsers(users);
    addLedger({ type: 'USER_IDENTITY', userId, note: `Identity updated for @${target.username}` });
    return target;
  }

  function resetPassword(actorRole, userId, newPassword) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];
    if (!canManageTarget(actorRole, target.role)) throw new Error('Permission denied.');
    target.password = String(newPassword || 'changeme');
    saveUsers(users);
    addLedger({ type: 'PASSWORD_RESET', userId, note: `Password reset for @${target.username}` });
    return true;
  }

  function changeOwnPassword(userId, newPassword) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];
    if (target.role === 'guest') throw new Error('Guest has no password.');
    const p = String(newPassword || '').trim();
    if (p.length < 4) throw new Error('Password must be at least 4 characters.');
    target.password = p;
    saveUsers(users);
    addLedger({ type: 'PASSWORD_SELF', userId, note: `Password changed by @${target.username}` });
    return true;
  }

  function setRole(actorRole, userId, newRole) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];

    if (!canManageTarget(actorRole, target.role)) throw new Error('Permission denied.');

    const nr = normalizeRole(newRole);
    if ((nr === 'admin') && normalizeRole(actorRole) !== 'root') {
      throw new Error('Only ROOT can promote to ADMIN/RISK.');
    }

    if (target.role === 'root') throw new Error('Root role cannot be changed in mock.');

    target.role = nr;
    target.avatarKey = (nr === 'player') ? 'player1' : nr;
    saveUsers(users);
    addLedger({ type: 'ROLE_CHANGE', userId, note: `Role changed to ${nr} for @${target.username}` });
    return target;
  }

  function setStatus(actorRole, userId, status) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];
    if (!canManageTarget(actorRole, target.role)) throw new Error('Permission denied.');

    const s = String(status || '').toLowerCase();
    if (!['active', 'frozen', 'banned'].includes(s)) throw new Error('Invalid status.');

    if (target.role === 'root') throw new Error('Root cannot be frozen/banned in mock.');

    target.status = s;
    saveUsers(users);
    addLedger({ type: 'STATUS_CHANGE', userId, note: `Status changed to ${s} for @${target.username}` });
    return target;
  }

  function setPlayerAvatar(userId, avatarKey) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];
    if (target.role !== 'player') throw new Error('Only players can change avatars.');
    const key = String(avatarKey || 'player1');
    if (!/^player[1-8]$/.test(key)) throw new Error('Invalid avatar selection.');
    target.avatarKey = key;
    saveUsers(users);
    return target;
  }

  // -------------------- wallet operations --------------------
  function getReservedCrown(userId) {
    const withdrawals = loadWithdrawals();
    const reservedFromWithdrawals = withdrawals
      .filter(w => w.userId === userId && (w.status === 'requested' || w.status === 'paid'))
      .reduce((sum, w) => sum + Number(w.amountCrown || 0), 0);
    return reservedFromWithdrawals;
  }

  function getAvailableCrown(userId) {
    const u = getUserById(userId);
    if (!u) return 0;
    return Math.max(0, Number(u.balanceCrown || 0) - getReservedCrown(userId));
  }

  function adjustPlayerBalance(actorRole, userId, deltaCrown, reason) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const target = users[idx];

    if (target.role !== 'player') throw new Error('Balance operations apply to players only.');

    const actor = normalizeRole(actorRole);

    // Who can do player balance ops?
    // - ADMIN/ROOT only
    if (!['admin', 'root'].includes(actor)) throw new Error('Permission denied.');

    target.balanceCrown = Math.max(0, Number(target.balanceCrown || 0) + Number(deltaCrown || 0));
    saveUsers(users);
    addLedger({ type: 'BALANCE_ADJUST', userId, deltaCrown: Number(deltaCrown || 0), note: reason || 'Manual adjustment' });
    return target.balanceCrown;
  }

  // drain means remove from player wallet and move to house (tracked only in ledger)
  function drainPlayer(actorRole, userId, amountCrown, reason) {
    const amt = Math.max(0, Number(amountCrown || 0));
    const available = getAvailableCrown(userId);
    if (amt <= 0) throw new Error('Amount must be > 0.');
    if (amt > available) throw new Error('Amount exceeds available balance.');
    adjustPlayerBalance(actorRole, userId, -amt, reason || 'Drain CROWN (house seizure)');
    addLedger({ type: 'HOUSE_SEIZE', userId, deltaCrown: -amt, note: 'Seized to house vault', meta: { seized: amt } });
    return true;
  }

  function burnPlayer(actorRole, userId, amountCrown, reason) {
    const amt = Math.max(0, Number(amountCrown || 0));
    const available = getAvailableCrown(userId);
    if (amt <= 0) throw new Error('Amount must be > 0.');
    if (amt > available) throw new Error('Amount exceeds available balance.');
    adjustPlayerBalance(actorRole, userId, -amt, reason || 'Burn CROWN');
    addLedger({ type: 'BURN', userId, deltaCrown: -amt, note: 'Burned from supply', meta: { burned: amt } });
    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }
    cfg.initialSupplyCrown = Math.max(0, Number(cfg.initialSupplyCrown || 0) - amt);

    saveConfig(cfg);
    return true;
  }

  function grantPlayer(actorRole, userId, amountCrown, reason) {
    const amt = Math.max(0, Number(amountCrown || 0));
    if (amt <= 0) throw new Error('Amount must be > 0.');
    adjustPlayerBalance(actorRole, userId, amt, reason || 'Grant CROWN');
    addLedger({ type: 'GRANT', userId, deltaCrown: amt, note: 'Granted by staff', meta: { granted: amt } });
    return true;
  }

  // -------------------- promo lock --------------------
  function getPromoLock(userId) {
    // Promos are disabled. Lock is always inactive.
    return { until: 0, active: false, remainingMs: 0 };
  }

  function startPromoLock(userId) {
    // Promos are disabled.
    return getPromoLock(userId);
  }

  function clearPromoLock(userId) {
    // Promos are disabled.
    return;
  }

  
  function loadWithdrawals() {
    const w = safeParse(localStorage.getItem(LS.WITHDRAWALS) || 'null', null);
    if (w && Array.isArray(w)) return w;
    localStorage.setItem(LS.WITHDRAWALS, JSON.stringify([]));
    return [];
  }

  function saveWithdrawals(withdrawals) {
    localStorage.setItem(LS.WITHDRAWALS, JSON.stringify(Array.isArray(withdrawals) ? withdrawals : []));
  }

  function loadDeposits() {
    const d = safeParse(localStorage.getItem(LS.DEPOSITS) || 'null', null);
    if (d && Array.isArray(d)) return d;
    localStorage.setItem(LS.DEPOSITS, JSON.stringify([]));
    return [];
  }

  function saveDeposits(deposits) {
    localStorage.setItem(LS.DEPOSITS, JSON.stringify(Array.isArray(deposits) ? deposits : []));
  }

// -------------------- deposits --------------------
  function createDepositInvoice({ userId, mode, localAmountUSD, network }) {
    const cfg = loadConfig();
    const deposits = loadDeposits();

    const net = String(network || 'TRC20').toUpperCase();
    const chosen = (net === 'ERC20') ? 'ERC20' : 'TRC20';

    const invoice = {
      id: uid('inv'),
      userId,
      mode: 'standard',
      createdAt: nowIso(),
      status: 'waiting',
      requiredConfirmations: chosen === 'ERC20' ? 18 : 12,
      confirmations: 0,

      // pricing
      localCurrency: 'USD',
      localAmount: Number(localAmountUSD || 0),
      crownUsdRate: 1,

      // network
      network: chosen,
      address: chosen === 'ERC20' ? '0xMOCK...ETH...ADDRESS' : 'TQ2J...MOCK...TRON',
      txid: null,

      // fees (only network fee)
      networkFeeUSDT: pct(Number((cfg.networkFeesUSDT || {})[chosen] || 0)),
      grossUSDT: 0,
      netUSDT: 0,

      // resulting
      crownsToCredit: 0,
      usdtToSend: 0,
    };

    const gross = Math.max(0, Number(invoice.localAmount || 0));
    invoice.grossUSDT = pct(gross);
    invoice.usdtToSend = pct(gross);

    const maxPerUser = Number(cfg.maxDepositPerUserUSDT || 0);
    if (maxPerUser > 0) {
      const u = getUserById(userId);
      const current = Number((u && u.stats && u.stats.depositsUSDT) || 0);
      if ((current + gross) > maxPerUser) {
        invoice.status = 'rejected';
        invoice.rejectReason = `Max deposit limit exceeded (${pct(maxPerUser)} USDT)`;
        deposits.unshift(invoice);
        saveDeposits(deposits);
        addLedger({ type: 'DEPOSIT_REJECTED', userId, note: invoice.rejectReason, meta: { invoiceId: invoice.id } });
        return invoice;
      }
    }

    const netUSDT = Math.max(0, gross - Number(invoice.networkFeeUSDT || 0));
    invoice.netUSDT = pct(netUSDT);
    invoice.crownsToCredit = pct(netUSDT); // 1 CROWN = 1 USDT

    deposits.unshift(invoice);
    saveDeposits(deposits);
    addLedger({ type: 'DEPOSIT_INVOICE', userId, note: 'Deposit invoice created', meta: { invoiceId: invoice.id, network: chosen } });
    return invoice;
  }

  function progressDeposit(invoiceId) {
    const deposits = loadDeposits();
    const idx = deposits.findIndex(d => d.id === invoiceId);
    if (idx < 0) return null;

    const inv = deposits[idx];
    if (inv.status === 'finished' || inv.status === 'rejected') return inv;

    if (inv.confirmations < inv.requiredConfirmations) {
      inv.confirmations += 3;
      if (inv.confirmations >= inv.requiredConfirmations) {
        inv.confirmations = inv.requiredConfirmations;
        inv.status = 'finished';
        inv.txid = inv.txid || `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`;

        // Credit crowns (net of network fee only)
        const users = loadUsers();
        const uIdx = users.findIndex(u => u.id === inv.userId);
        if (uIdx >= 0) {
          users[uIdx].balanceCrown = Number(users[uIdx].balanceCrown || 0) + Number(inv.crownsToCredit || 0);
          users[uIdx].stats = users[uIdx].stats || {};
          users[uIdx].stats.depositsUSDT = Number(users[uIdx].stats.depositsUSDT || 0) + Number(inv.grossUSDT || inv.usdtToSend || 0);
          saveUsers(users);
        }

        addLedger({
          type: 'DEPOSIT_FINISHED',
          userId: inv.userId,
          deltaCrown: Number(inv.crownsToCredit || 0),
          deltaUSDT: Number(inv.grossUSDT || inv.usdtToSend || 0),
          note: 'Deposit credited',
          meta: { invoiceId, networkFeeUSDT: Number(inv.networkFeeUSDT || 0), netUSDT: Number(inv.netUSDT || 0) }
        });
      } else {
        inv.status = inv.confirmations > 0 ? 'confirming' : 'waiting';
      }
    }

    deposits[idx] = inv;
    saveDeposits(deposits);
    return inv;
  }

  // -------------------- withdrawals --------------------
  function quoteWithdrawal({ userId, amountCrown, network }) {
    const cfg = loadConfig();
    const enums = getEnums();

    const amt = Math.max(0, Number(amountCrown || 0));
    const chosen = (String(network || 'TRC20').toUpperCase() === 'ERC20') ? 'ERC20' : 'TRC20';

    const gross = amt; // 1 CROWN = 1 USDT
    const networkFee = Number((cfg.networkFeesUSDT || {})[chosen] || 0);

    const totalFeeUSDT = Math.min(networkFee, gross);
    const net = Math.max(0, gross - totalFeeUSDT);

    return {
      grossUSDT: pct(gross),
      networkFeeUSDT: pct(networkFee),
      totalFeePct: gross > 0 ? pct((totalFeeUSDT / gross) * 100) : 0,
      totalFeeUSDT: pct(totalFeeUSDT),
      netUSDT: pct(net),
      crownUsdRate: 1,
      network: chosen,
    };
  }

  function createWithdrawalRequest({ userId, amountCrown, network, address }) {
    const cfg = loadConfig();
    const enums = getEnums();

    const user = getUserById(userId);
    if (!user) throw new Error('User not found.');
    if (user.role !== 'player') throw new Error('Only players can request withdrawal.');

    // Must have played at least one hand since registration
    const played = !!(user.meta && user.meta.hasPlayedHand) || Number((user.stats || {}).hands || 0) >= 1;
    if (!played) throw new Error('You can request a withdrawal only after playing at least 1 game.');

    if (!cfg.withdrawalsActive) throw new Error('Withdrawals are currently disabled.');

    const amt = Math.max(0, Number(amountCrown || 0));
    const minReq = Number(cfg.withdrawRequestMinCrown || enums.withdrawRequestMin);
    if (amt < minReq) throw new Error(`Minimum withdrawal request is ${minReq} CROWN`);

    const available = getAvailableCrown(userId);
    if (amt > available) throw new Error('Amount exceeds available wallet balance.');

    const chosen = (String(network || 'TRC20').toUpperCase() === 'ERC20') ? 'ERC20' : 'TRC20';
    const addr = String(address || '').trim();
    if (!addr) throw new Error('Wallet address is required.');

    // Reserve funds (move from wallet to reserved)
    const users = loadUsers();
    const uIdx = users.findIndex(u => u.id === userId);
    if (uIdx < 0) throw new Error('User not found.');
    users[uIdx].balanceCrown = pct(Math.max(0, Number(users[uIdx].balanceCrown || 0) - amt));
    users[uIdx].reservedCrown = pct(Number(users[uIdx].reservedCrown || 0) + amt);
    saveUsers(users);

    const quote = quoteWithdrawal({ userId, amountCrown: amt, network: chosen });

    const withdrawals = loadWithdrawals();
    const req = {
      id: uid('wd'),
      userId,
      createdAt: nowIso(),
      status: 'requested', // requested -> approved/rejected -> paid
      amountCrown: pct(amt),
      network: chosen,
      address: addr,
      quote,
      adminDecision: null,
      adminDecisionAt: null,
      paidAt: null,
      txid: null,
      note: '',
    };

    withdrawals.unshift(req);
    saveWithdrawals(withdrawals);

    addLedger({ type: 'WITHDRAW_REQUEST', userId, deltaCrown: -amt, note: 'Withdrawal requested', meta: { withdrawalId: req.id, network: chosen } });
    return req;
  }

  function setWithdrawalAdminDecision(actorRole, requestId, decision, note) {
    const actor = normalizeRole(actorRole);
    if (!['admin', 'root'].includes(actor)) throw new Error('Permission denied.');

    const withdrawals = loadWithdrawals();
    const idx = withdrawals.findIndex(w => w.id === requestId);
    if (idx < 0) throw new Error('Request not found.');

    const req = withdrawals[idx];
    if (req.status !== 'requested') throw new Error('Only requested withdrawals can be decided.');

    const dec = String(decision || '').toLowerCase();
    if (!['approve', 'reject'].includes(dec)) throw new Error('Invalid decision.');

    req.adminDecision = dec;
    req.adminDecisionAt = nowIso();
    req.note = String(note || '').trim();

    const users = loadUsers();
    const uIdx = users.findIndex(u => u.id === req.userId);
    if (uIdx < 0) throw new Error('User not found.');
    users[uIdx].reservedCrown = pct(Number(users[uIdx].reservedCrown || 0));

    if (dec === 'approve') {
      req.status = 'approved';
      withdrawals[idx] = req;
      saveWithdrawals(withdrawals);
      saveUsers(users);
      addLedger({ type: 'WITHDRAW_APPROVED', userId: req.userId, note: 'Withdrawal approved', meta: { withdrawalId: req.id } });
      return req;
    }

    // Reject: release reserved funds back to wallet
    const amt = Number(req.amountCrown || 0);
    users[uIdx].reservedCrown = pct(Math.max(0, Number(users[uIdx].reservedCrown || 0) - amt));
    users[uIdx].balanceCrown = pct(Number(users[uIdx].balanceCrown || 0) + amt);
    saveUsers(users);

    req.status = 'rejected';
    withdrawals[idx] = req;
    saveWithdrawals(withdrawals);

    addLedger({ type: 'WITHDRAW_REJECTED', userId: req.userId, deltaCrown: amt, note: 'Withdrawal rejected (funds released)', meta: { withdrawalId: req.id } });
    return req;
  }

  function payWithdrawal(actorRole, requestId, txid) {
    const actor = normalizeRole(actorRole);
    if (!['admin', 'root'].includes(actor)) throw new Error('Only Admin/Root can mark payout as paid.');

    const withdrawals = loadWithdrawals();
    const idx = withdrawals.findIndex(w => w.id === requestId);
    if (idx < 0) throw new Error('Request not found.');

    const req = withdrawals[idx];
    if (req.status !== 'approved') throw new Error('Only approved requests can be paid.');

    const t = String(txid || '').trim();
    if (t.length < 6) throw new Error('TXID is required.');

    const users = loadUsers();
    const uIdx = users.findIndex(u => u.id === req.userId);
    if (uIdx < 0) throw new Error('User not found.');

    const amt = Number(req.amountCrown || 0);
    const reserved = Number(users[uIdx].reservedCrown || 0);
    if (amt > reserved) throw new Error('Reserved balance is insufficient for payout.');

    // Finalize: burn reserved chips (convert to USDT off-platform via admin transfer)
    users[uIdx].reservedCrown = pct(Math.max(0, reserved - amt));
    saveUsers(users);

    req.status = 'paid';
    req.paidAt = nowIso();
    req.txid = t;
    withdrawals[idx] = req;
    saveWithdrawals(withdrawals);

    addLedger({ type: 'WITHDRAW_PAID', userId: req.userId, note: 'Withdrawal marked as paid', meta: { withdrawalId: req.id, txid: t } });
    return req;
  }

  // -------------------- system config controls --------------------
  function setWithdrawalsActive(actorRole, enabled) {
    const actor = normalizeRole(actorRole);
    if (!['admin','root'].includes(actor)) throw new Error('Permission denied.');
    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }
    cfg.withdrawalsActive = !!enabled;

    saveConfig(cfg);
    logSecurity('warn', 'KILL_SWITCH', `WithdrawalsActive set to ${cfg.withdrawalsActive}`, { by: actor });
    return cfg;
  }


  function setScheduleEnabled(actorRole, enabled) {
    const actor = normalizeRole(actorRole);
    if (!['admin','root'].includes(actor)) throw new Error('Permission denied.');
    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }
    cfg.scheduleEnabled = !!enabled;

    saveConfig(cfg);
    logSecurity('info', 'SCHEDULE', `Schedule enabled set to ${cfg.scheduleEnabled}`, { by: actor });
    return cfg;
  }

  function setTimezone(actorRole, tz) {
    const actor = normalizeRole(actorRole);
    if (!['admin','root'].includes(actor)) throw new Error('Permission denied.');
    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }
    cfg.timezone = String(tz || 'local');

    saveConfig(cfg);
    logSecurity('info', 'SCHEDULE', `Timezone set to ${cfg.timezone}`, { by: actor });
    return cfg;
  }

  function updateWeeklySchedule(actorRole, patch) {
    const actor = normalizeRole(actorRole);
    if (!['admin','root'].includes(actor)) throw new Error('Permission denied.');
    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }
    cfg.weeklySchedule = cfg.weeklySchedule || {};
    Object.keys(patch || {}).forEach((k) => {
      const day = Number(k);
      if (Number.isNaN(day) || day < 0 || day > 6) return;
      const row = patch[k] || {};
      cfg.weeklySchedule[day] = {
        enabled: row.enabled !== undefined ? !!row.enabled : !!(cfg.weeklySchedule[day] && cfg.weeklySchedule[day].enabled),
        open: (row.open !== undefined ? String(row.open) : (cfg.weeklySchedule[day] && cfg.weeklySchedule[day].open) || '18:00'),
        close: (row.close !== undefined ? String(row.close) : (cfg.weeklySchedule[day] && cfg.weeklySchedule[day].close) || '02:00'),
      };
    });

    saveConfig(cfg);
    logSecurity('info', 'SCHEDULE', `Weekly schedule updated`, { by: actor });
    return cfg;
  }

  function getSiteStatus() {
    return computeSiteStatus();
  }

  function updateFinanceConfig(actorRole, patch) {
    const actor = normalizeRole(actorRole);
    if (!['admin', 'root'].includes(actor)) throw new Error('Only Admin/Root can change finance parameters.');

    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }

    // Value model is fixed: 1 CROWN = 1 USD
    cfg.crownUsdRate = 1;

    if (patch.dailyMintCap !== undefined) {
      cfg.dailyMintCap = clamp(patch.dailyMintCap, 0, 1000000);
    }

    if (patch.issuanceFrozen !== undefined) {
      cfg.issuanceFrozen = !!patch.issuanceFrozen;
    }

    if (patch.mintedToday !== undefined) {
      cfg.mintedToday = clamp(patch.mintedToday, 0, cfg.dailyMintCap);
    }

    if (patch.fixedWithdrawalFeeMode !== undefined) {
      cfg.fixedWithdrawalFeeMode = !!patch.fixedWithdrawalFeeMode;
    }

    if (patch.fixedWithdrawalTotalFeePct !== undefined) {
      cfg.fixedWithdrawalTotalFeePct = clamp(patch.fixedWithdrawalTotalFeePct, 0, getEnums().maxWithdrawFeePct);
    }

    if (patch.withdrawalServicePct !== undefined) {
      cfg.withdrawalServicePct = clamp(patch.withdrawalServicePct, 0, getEnums().maxWithdrawFeePct);
    }

    if (patch.networkFeesUSDT) {
      cfg.networkFeesUSDT = {
        TRC20: clamp(patch.networkFeesUSDT.TRC20, 0, 500),
        ERC20: clamp(patch.networkFeesUSDT.ERC20, 0, 500),
      };
    }

    saveConfig(cfg);
    addLedger({ type: 'FINANCE_CONFIG', note: 'Finance parameters updated', meta: { by: actor } });
    logSecurity('info', 'FINANCE', 'Finance parameters updated', { by: actor });
    return cfg;
  }

  // -------------------- table operations --------------------
  function getTableById(tableId) {
    return loadTables().find(t => t.id === tableId) || null;
  }

  function seatPlayer({ userId, tableId, seatIndex }) {
    const cfg = loadConfig();
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      const next = site.nextOpenAt ? new Date(site.nextOpenAt) : null;
      const when = next ? next.toLocaleString() : 'later';
      throw new Error(`Table is closed. Opens at ${when}.`);
    }
    const user = getUserById(userId);
    if (!user) throw new Error('User not found.');
    if (user.role !== 'player') throw new Error('Only players can take seats.');
    if (user.status !== 'active') throw new Error('Account is not active.');

    const tables = loadTables();
    const tIdx = tables.findIndex(t => t.id === tableId);
    if (tIdx < 0) throw new Error('Table not found.');
    const table = tables[tIdx];

    const idx = Number(seatIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= table.maxPlayers) throw new Error('Invalid seat.');

    if (table.seats[idx] && table.seats[idx].userId) throw new Error('Seat is already occupied.');

    // If table is full, push to waiting lounge
    if (countSeatedPlayers(table) >= table.maxPlayers) {
      if (!table.waiting.includes(userId)) table.waiting.push(userId);
      tables[tIdx] = table;
      saveTables(tables);
      addLedger({ type: 'QUEUE_JOIN', userId, tableId, note: `Joined waiting lounge for ${table.name}` });
      return { queued: true, table };
    }

    // Move full wallet balance into the table as chips (no buy-in fees, no house fees)
    const available = getAvailableCrown(userId);
    if (available <= 0) throw new Error('Insufficient balance.');

    const users = loadUsers();
    const uIdx = users.findIndex(u => u.id === userId);
    if (uIdx < 0) throw new Error('User not found.');

    // Move everything into the seat stack
    users[uIdx].balanceCrown = Math.max(0, Number(users[uIdx].balanceCrown || 0) - available);
    saveUsers(users);

    table.seats[idx] = { userId, stackCrown: pct(available) };

    // Assign hole cards in hand object
    if (!table.hand || !table.hand.holeCards) table.hand = mkHand();
    table.hand.holeCards[userId] = [drawCard(table), drawCard(table)];

    tables[tIdx] = table;
    saveTables(tables);

    addLedger({ type: 'SEAT', userId, tableId, deltaCrown: -available, note: `Moved ${pct(available)} CROWN to table stack` });

    return { queued: false, table, movedToStack: pct(available) };
  }


  function autoSeatFromWaiting(tableId) {
    const site = computeSiteStatus();
    if (site && site.scheduleEnabled && !site.siteOpenNow) {
      // When closed, do not start a new hand or auto-seat new players.
      return null;
    }

    const tables = loadTables();
    const tIdx = tables.findIndex(t => t.id === tableId);
    if (tIdx < 0) return null;
    const table = tables[tIdx];
    table.waiting = Array.isArray(table.waiting) ? table.waiting : [];

    // Find first empty seat
    let emptyIdx = -1;
    for (let i = 0; i < table.maxPlayers; i++) {
      const s = table.seats[i];
      if (!s || !s.userId) { emptyIdx = i; break; }
    }
    if (emptyIdx < 0) return null;
    if (!table.waiting.length) return null;

    // Pop the next waiting user (FIFO). If user cannot be seated, skip them.
    while (table.waiting.length && emptyIdx >= 0) {
      const nextUserId = table.waiting.shift();
      const user = getUserById(nextUserId);
      if (!user || user.role !== 'player' || user.status !== 'active') continue;

      const available = getAvailableCrown(nextUserId);
      if (available <= 0) continue;

      const users = loadUsers();
      const uIdx = users.findIndex(u => u.id === nextUserId);
      if (uIdx < 0) continue;

      // Move wallet → stack
      users[uIdx].balanceCrown = Math.max(0, Number(users[uIdx].balanceCrown || 0) - available);
      saveUsers(users);

      table.seats[emptyIdx] = { userId: nextUserId, stackCrown: pct(available) };

      if (!table.hand || !table.hand.holeCards) table.hand = mkHand();
      table.hand.holeCards[nextUserId] = [drawCard(table), drawCard(table)];

      tables[tIdx] = table;
      saveTables(tables);

      addLedger({ type: 'QUEUE_SEATED', userId: nextUserId, tableId, deltaCrown: -available, note: `Auto-seated from waiting lounge into seat ${emptyIdx + 1}` });
      appendTableChat(tableId, { fromUserId: 'system', text: `SYSTEM: @${(user || {}).username || 'player'} was seated from the waiting lounge.` });

      return { userId: nextUserId, seatIndex: emptyIdx };
    }

    tables[tIdx] = table;
    saveTables(tables);
    return null;
  }

  function drawCard(table) {
    // Use futureBoard pool first then regenerate if needed
    if (!table.hand) table.hand = mkHand();

    const pool = table.hand.futureBoard || [];
    if (pool.length) return pool.shift();

    const deck = buildDeck().sort(() => Math.random() - 0.5);
    return deck.pop();
  }

  function kickPlayer(actorRole, tableId, userId, reason) {
    const actor = normalizeRole(actorRole);
    if (!['admin', 'root'].includes(actor)) throw new Error('Only ADMIN/ROOT can kick players.');

    const tables = loadTables();
    const tIdx = tables.findIndex(t => t.id === tableId);
    if (tIdx < 0) throw new Error('Table not found.');
    const table = tables[tIdx];

    // Remove from seat
    let kickedSeat = -1;
    for (let i = 0; i < table.seats.length; i++) {
      const s = table.seats[i];
      if (s && s.userId === userId) {
        kickedSeat = i;
        table.seats[i] = null;
      }
    }

    // Also remove from waiting
    table.waiting = (table.waiting || []).filter(x => x !== userId);

    tables[tIdx] = table;
    saveTables(tables);

    // If there is a waiting queue, seat the next player (FIFO) into any newly freed seat.
    try { autoSeatFromWaiting(tableId); } catch (_) {}

    logSecurity('high', 'KICK', 'Player kicked from table', { by: actor, tableId, userId, seat: kickedSeat, reason: reason || '' });
    addLedger({ type: 'KICK', userId, tableId, note: `Kicked by ${actor}. ${reason || ''}` });

    // System message in table chat
    appendTableChat(tableId, { fromUserId: 'system', text: `SYSTEM: @${(getUserById(userId) || {}).username || 'player'} was removed by ${actor.toUpperCase()}.` });

    return { seat: kickedSeat };
  }


function simulateHand(tableId) {
  const cfg = loadConfig();
  const site = computeSiteStatus();
  // If schedule is enabled and currently closed, do not start a new hand.
  // However, never crash an ongoing hand – it will be progressed by tickHands().
  if (site && site.scheduleEnabled && !site.siteOpenNow) return null;

  const tables = loadTables();
  const tIdx = tables.findIndex(t => t.id === tableId);
  if (tIdx < 0) throw new Error('Table not found.');
  const table = tables[tIdx];

  // If a hand is already running, don't start another one.
  if (table.hand && table.hand.inProgress) return table.hand;

  const seated = (table.seats || []).map((s, i) => ({ s, i })).filter(x => x.s && x.s.userId);
  if (seated.length < 2) return null;

  // Rotate dealer each hand
  table.dealerIndex = Number.isFinite(table.dealerIndex) ? table.dealerIndex : 0;
  table.dealerIndex = (table.dealerIndex + 1) % table.maxPlayers;

  const sb = Number((table.blinds || {}).sb || 1);
  const bb = Number((table.blinds || {}).bb || 2);

  // Build a deterministic hand deck so Live Peek can show "future" cards.
  const deck = buildDeck().sort(() => Math.random() - 0.5);

  const hand = {
    roundId: uid('hand'),
    inProgress: true,
    stage: 'preflop',
    startedAtMs: now(),
    startedAt: nowIso(),
    revealFlopAt: 0,
    revealTurnAt: 0,
    revealRiverAt: 0,
    endsAtMs: 0,

    holeCards: {},           // userId -> [card, card]
    plannedBoard: [],        // 5 cards (flop/turn/river) planned at start
    community: [],           // revealed progressively
    futureBoard: [],         // plannedBoard + remainder (for Live Peek UI)
    potCrown: 0,

    lastWinnerUserId: null,
    lastWinnerAmount: 0,
    lastFinishedAt: null,
  };

  // Deal hole cards (remove from deck)
  for (const x of seated) {
    hand.holeCards[x.s.userId] = [deck.shift(), deck.shift()];
  }

  // Plan the community board (remove from deck)
  hand.plannedBoard = [deck.shift(), deck.shift(), deck.shift(), deck.shift(), deck.shift()];

  // For compatibility with existing Live Peek renderer: show the next 5 as the future board.
  hand.futureBoard = hand.plannedBoard.concat(deck);

  // Post blinds (from stack, no house fees)
  function nextOccupied(fromIdx) {
    for (let step = 1; step <= table.maxPlayers; step++) {
      const idx = (fromIdx + step) % table.maxPlayers;
      const seat = table.seats[idx];
      if (seat && seat.userId) return idx;
    }
    return null;
  }

  const dealer = table.dealerIndex;
  const sbIdx = nextOccupied(dealer);
  const bbIdx = sbIdx === null ? null : nextOccupied(sbIdx);

  function takeBlind(idx, amt) {
    if (idx === null) return 0;
    const seat = table.seats[idx];
    if (!seat) return 0;
    const take = Math.min(Number(seat.stackCrown || 0), Math.max(0, amt));
    seat.stackCrown = pct(Math.max(0, Number(seat.stackCrown || 0) - take));
    table.seats[idx] = seat;
    return take;
  }

  const sbTaken = takeBlind(sbIdx, sb);
  const bbTaken = takeBlind(bbIdx, bb);
  hand.potCrown = pct(sbTaken + bbTaken);

  // Cinematic timing (ms)
  const t0 = hand.startedAtMs;
  hand.revealFlopAt = t0 + 2200;
  hand.revealTurnAt = t0 + 3600;
  hand.revealRiverAt = t0 + 5100;
  hand.endsAtMs = t0 + 6900;

  // Attach hand and persist
  table.hand = hand;
  tables[tIdx] = table;
  saveTables(tables);

  logSecurity('info', 'GAME', 'Hand started', { tableId, roundId: hand.roundId, pot: hand.potCrown, sbTaken, bbTaken, sb, bb });
  return hand;
}

function tickHands(tableId) {
  const tables = loadTables();
  const tIdx = tables.findIndex(t => t.id === tableId);
  if (tIdx < 0) return null;
  const table = tables[tIdx];
  const hand = table.hand;
  if (!hand || !hand.inProgress) return null;

  const t = now();
  let changed = false;

  // Reveal community gradually
  if (t >= hand.revealFlopAt && hand.community.length < 3) {
    hand.community = hand.plannedBoard.slice(0, 3);
    hand.stage = 'flop';
    changed = true;
  }
  if (t >= hand.revealTurnAt && hand.community.length < 4) {
    hand.community = hand.plannedBoard.slice(0, 4);
    hand.stage = 'turn';
    changed = true;
  }
  if (t >= hand.revealRiverAt && hand.community.length < 5) {
    hand.community = hand.plannedBoard.slice(0, 5);
    hand.stage = 'river';
    changed = true;
  }

  // Finish hand at the end of the timeline
  if (t >= hand.endsAtMs) {
    hand.community = hand.plannedBoard.slice(0, 5);

    const seated = (table.seats || []).map((s, i) => ({ s, i })).filter(x => x.s && x.s.userId);
    if (seated.length >= 1) {
      const eligible = seated.filter(x => Number((table.seats[x.i] || {}).stackCrown || 0) > 0);
      const pool = eligible.length ? eligible : seated;
      const winnerSeat = pool[Math.floor(Math.random() * pool.length)];
      const winnerId = winnerSeat.s.userId;

      // Pay pot to winner stack
      const wSeatIdx = winnerSeat.i;
      const wSeat = table.seats[wSeatIdx];
      wSeat.stackCrown = pct(Number(wSeat.stackCrown || 0) + Number(hand.potCrown || 0));
      table.seats[wSeatIdx] = wSeat;

      // Mark stats: each seated player played a hand
      const users = loadUsers();
      const participatedIds = seated.map(x => x.s.userId);
      for (const uid0 of participatedIds) {
        const uIdx = users.findIndex(u => u.id === uid0);
        if (uIdx < 0) continue;
        users[uIdx].stats = users[uIdx].stats || {};
        users[uIdx].meta = users[uIdx].meta || {};
        users[uIdx].stats.hands = Number(users[uIdx].stats.hands || 0) + 1;
        users[uIdx].meta.hasPlayedHand = true;
        if (!users[uIdx].meta.firstHandAt) users[uIdx].meta.firstHandAt = nowIso();
      }
      const wIdx = users.findIndex(u => u.id === winnerId);
      if (wIdx >= 0) {
        users[wIdx].stats.winLoss = Number(users[wIdx].stats.winLoss || 0) + Number(hand.potCrown || 0);
      }
      saveUsers(users);

      hand.lastWinnerUserId = winnerId;
      hand.lastWinnerAmount = pct(hand.potCrown || 0);
      hand.lastFinishedAt = nowIso();
      hand.inProgress = false;
      hand.stage = 'finished';
      changed = true;

      addLedger({ type: 'HAND_FINISHED', userId: winnerId, tableId, deltaCrown: Number(hand.potCrown || 0), note: `Winner payout ${pct(hand.potCrown || 0)}` });
      logSecurity('info', 'GAME', 'Hand finished', { tableId, roundId: hand.roundId, winnerUserId: winnerId, pot: hand.potCrown });

      // Notify UI (winner overlay)
      try {
        window.dispatchEvent(new CustomEvent('ROYAL_HAND_FINISHED', { detail: { tableId, roundId: hand.roundId, winnerUserId: winnerId, amount: pct(hand.potCrown || 0) } }));
      } catch (_) {}
    } else {
      hand.inProgress = false;
      hand.stage = 'finished';
      changed = true;
    }
  }

  if (changed) {
    table.hand = hand;
    tables[tIdx] = table;
    saveTables(tables);
  }
  return hand;
}


  // -------------------- bootstrap --------------------
  function ensureBootstrap() {
    loadConfig();
    loadUsers();
    loadTables();
    loadWithdrawals();
    loadDeposits();
    loadSecurityEvents();
    loadPromoLocks();
    loadLedger();
  }

  ensureBootstrap();

  // -------------------- public API --------------------
  window.ROYAL_STORE = {
    // Compatibility layer for legacy modules (floating chat)
    loadChatMessages,
    saveChatMessages,
    appendChatMessage,

    // New store API
    loadConfig,
    saveConfig,
    updateFinanceConfig,
    setWithdrawalsActive,
    setScheduleEnabled,
    setTimezone,
    updateWeeklySchedule,
    getSiteStatus,

    loadUsers,
    getUserById,
    getUserByUsername,
    authenticateUser,
    publicRegister,
    isUserSeatedAtTable,
    isUserQueuedForTable,
    createUser,
    deleteUser,
    updateUserIdentity,
    resetPassword,
    changeOwnPassword,
    setRole,
    setStatus,
    setPlayerAvatar,

    listOnlinePlayers,

    loadTables,
    saveTables,
    listTables,
    getTableById,
    seatPlayer,
    autoSeatFromWaiting,
    kickPlayer,
    simulateHand,
    tickHands,
    countSeatedPlayers,

    getReservedCrown,
    getAvailableCrown,
    adjustPlayerBalance,
    grantPlayer,
    burnPlayer,
    drainPlayer,

    loadWithdrawals,
    quoteWithdrawal,
    createWithdrawalRequest,
    setWithdrawalAdminDecision,
    payWithdrawal,

    loadDeposits,
    createDepositInvoice,
    progressDeposit,

    getPromoLock,
    startPromoLock,
    clearPromoLock,

    loadSecurityEvents,
    logSecurity,

    appendTableChat,
    getTableChat,

    loadMutes,
    isMuted,
    muteUser,
    unmuteUser,

    loadLedger,
    addLedger,

    isStaff,
    canManageTarget,
    setUserLastSeen,
  };
})();
