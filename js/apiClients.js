/**
 * ==========================================
 * ROYAL - API CLIENT (Frontend ↔ Backend Bridge)
 * ==========================================
 * This file is the swap layer that lets the current UI keep working 1:1,
 * while gradually replacing LocalStorage (royalStore.js) with real backend APIs.
 *
 * How to use later:
 *   const client = window.ROYAL_API_CLIENTS.create({ baseUrl: 'https://api.yourdomain.com' });
 *   window.ROYAL_API_CLIENTS.enableApiStore(client);
 *
 * Default behavior right now:
 *   - Nothing changes. The app continues using window.ROYAL_STORE (local store).
 */
(function () {
  function safeJson(x) {
    try { return JSON.stringify(x); } catch (_) { return '{}'; }
  }

  function createRoyalApiClient(opts) {
    const options = Object.assign({
      baseUrl: '/api',
      timeoutMs: 15000,
      tokenStorageKey: 'royal_auth_token',
    }, (opts || {}));

    function getToken() {
      try { return localStorage.getItem(options.tokenStorageKey) || ''; } catch (_) { return ''; }
    }

    async function request(path, init) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), options.timeoutMs);

      const token = getToken();
      const headers = Object.assign({ 'Content-Type': 'application/json' }, (init && init.headers) || {});
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const base = String(options.baseUrl || '').replace(/\/$/, '');
        const res = await fetch(`${base}${path}`, Object.assign({}, init || {}, {
          headers,
          signal: ctrl.signal,
        }));

        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '');

        if (!res.ok) {
          const msg = (body && body.error) ? String(body.error) : `HTTP ${res.status}`;
          const err = new Error(msg);
          err.status = res.status;
          err.body = body;
          throw err;
        }

        return body;
      } finally {
        clearTimeout(t);
      }
    }

    // ---- AUTH ----
    async function authenticateUser(payload) {
      // POST /auth/login { username, password } -> { token, user }
      const out = await request('/auth/login', { method: 'POST', body: safeJson(payload || {}) });
      if (out && out.token) {
        try { localStorage.setItem(options.tokenStorageKey, String(out.token)); } catch (_) {}
      }
      return out;
    }

    async function publicRegister(payload) {
      // POST /auth/register { username, password, firstName, lastName } -> { token, user }
      const out = await request('/auth/register', { method: 'POST', body: safeJson(payload || {}) });
      if (out && out.token) {
        try { localStorage.setItem(options.tokenStorageKey, String(out.token)); } catch (_) {}
      }
      return out;
    }

    // ---- SYSTEM / CONFIG ----
    const loadConfig = () => request('/config', { method: 'GET' });
    const saveConfig = (cfg) => request('/config', { method: 'PUT', body: safeJson(cfg || {}) });
    const updateFinanceConfig = (patch) => request('/config/finance', { method: 'PATCH', body: safeJson(patch || {}) });
    const getSiteStatus = () => request('/system/status', { method: 'GET' });

    // ---- USERS ----
    const loadUsers = () => request('/users', { method: 'GET' });
    const getUserById = (id) => request(`/users/${encodeURIComponent(String(id))}`, { method: 'GET' });
    const getUserByUsername = (username) => request(`/users/by-username/${encodeURIComponent(String(username))}`, { method: 'GET' });
    const createUser = (payload) => request('/users', { method: 'POST', body: safeJson(payload || {}) });
    const deleteUser = (id) => request(`/users/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
    const updateUserIdentity = (id, patch) => request(`/users/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: safeJson(patch || {}) });
    const setRole = (id, role) => request(`/users/${encodeURIComponent(String(id))}/role`, { method: 'PUT', body: safeJson({ role }) });
    const setStatus = (id, status) => request(`/users/${encodeURIComponent(String(id))}/status`, { method: 'PUT', body: safeJson({ status }) });

    // ---- TABLES ----
    const listTables = () => request('/tables', { method: 'GET' });
    const getTableById = (tableId) => request(`/tables/${encodeURIComponent(String(tableId))}`, { method: 'GET' });
    const seatPlayer = (payload) => request(`/tables/${encodeURIComponent(String(payload.tableId))}/seat`, { method: 'POST', body: safeJson(payload || {}) });
    const kickPlayer = (payload) => request(`/tables/${encodeURIComponent(String(payload.tableId))}/kick`, { method: 'POST', body: safeJson(payload || {}) });

    // ---- DEPOSITS ----
    const loadDeposits = () => request('/deposits', { method: 'GET' });
    const createDepositInvoice = (payload) => request('/deposits/invoice', { method: 'POST', body: safeJson(payload || {}) });
    const progressDeposit = (payload) => request(`/deposits/${encodeURIComponent(String(payload.id))}/progress`, { method: 'POST', body: safeJson(payload || {}) });

    // ---- WITHDRAWALS ----
    const loadWithdrawals = () => request('/withdrawals', { method: 'GET' });
    const quoteWithdrawal = (payload) => request('/withdrawals/quote', { method: 'POST', body: safeJson(payload || {}) });
    const createWithdrawalRequest = (payload) => request('/withdrawals/request', { method: 'POST', body: safeJson(payload || {}) });
    const setWithdrawalAdminDecision = (payload) => request(`/withdrawals/${encodeURIComponent(String(payload.id))}/decision`, { method: 'POST', body: safeJson(payload || {}) });
    const payWithdrawal = (payload) => request(`/withdrawals/${encodeURIComponent(String(payload.id))}/pay`, { method: 'POST', body: safeJson(payload || {}) });

    function notImplemented(name) {
      return () => { throw new Error(`API client: ${name} not implemented yet`); };
    }

    return {
      authenticateUser,
      publicRegister,

      loadConfig,
      saveConfig,
      updateFinanceConfig,
      getSiteStatus,

      loadUsers,
      getUserById,
      getUserByUsername,
      createUser,
      deleteUser,
      updateUserIdentity,
      setRole,
      setStatus,

      listTables,
      getTableById,
      seatPlayer,
      kickPlayer,

      loadDeposits,
      createDepositInvoice,
      progressDeposit,

      loadWithdrawals,
      quoteWithdrawal,
      createWithdrawalRequest,
      setWithdrawalAdminDecision,
      payWithdrawal,

      // parity stubs
      resetPassword: notImplemented('resetPassword'),
      changeOwnPassword: notImplemented('changeOwnPassword'),
      setPlayerAvatar: notImplemented('setPlayerAvatar'),
      updateWeeklySchedule: notImplemented('updateWeeklySchedule'),
      setWithdrawalsActive: notImplemented('setWithdrawalsActive'),
      setScheduleEnabled: notImplemented('setScheduleEnabled'),
      setTimezone: notImplemented('setTimezone'),
      simulateHand: notImplemented('simulateHand'),
      autoSeatFromWaiting: notImplemented('autoSeatFromWaiting'),
    };
  }

  function enableApiStore(client) {
    if (!client) throw new Error('enableApiStore: client is required');
    const localFallback = window.ROYAL_STORE || {};

    window.ROYAL_STORE = {
      // Auth
      authenticateUser: (p) => client.authenticateUser(p),
      publicRegister: (p) => client.publicRegister(p),

      // System
      loadConfig: () => client.loadConfig(),
      saveConfig: (cfg) => client.saveConfig(cfg),
      updateFinanceConfig: (patch) => client.updateFinanceConfig(patch),
      getSiteStatus: () => client.getSiteStatus(),

      // Users
      loadUsers: () => client.loadUsers(),
      getUserById: (id) => client.getUserById(id),
      getUserByUsername: (u) => client.getUserByUsername(u),
      createUser: (p) => client.createUser(p),
      deleteUser: (id) => client.deleteUser(id),
      updateUserIdentity: (id, p) => client.updateUserIdentity(id, p),
      setRole: (id, role) => client.setRole(id, role),
      setStatus: (id, status) => client.setStatus(id, status),

      // Tables
      listTables: () => client.listTables(),
      getTableById: (id) => client.getTableById(id),
      seatPlayer: (p) => client.seatPlayer(p),
      kickPlayer: (p) => client.kickPlayer(p),

      // Deposits
      loadDeposits: () => client.loadDeposits(),
      createDepositInvoice: (p) => client.createDepositInvoice(p),
      progressDeposit: (p) => client.progressDeposit(p),

      // Withdrawals
      loadWithdrawals: () => client.loadWithdrawals(),
      quoteWithdrawal: (p) => client.quoteWithdrawal(p),
      createWithdrawalRequest: (p) => client.createWithdrawalRequest(p),
      setWithdrawalAdminDecision: (p) => client.setWithdrawalAdminDecision(p),
      payWithdrawal: (p) => client.payWithdrawal(p),

      // Unmigrated methods continue to exist (local behavior) so UI doesn’t break
      ...localFallback,
    };
  }

  window.ROYAL_API_CLIENTS = {
    create: createRoyalApiClient,
    enableApiStore,
  };
})();
