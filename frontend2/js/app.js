/**
 * ==========================================
 * ROYAL - MAIN APPLICATION ENGINE (V2.6)
 * ==========================================
 * Central controller for state management,
 * dynamic routing, and UI shell injection.
 *
 * Fixes in v2.6:
 * - Role field normalized (state.role mirrors state.activeRole)
 * - Auth screens now get Floating UI (Support Chat) + DEV toolbar
 * - Language switching works on Auth + RTL for HE/AR
 */

// --- 1. GLOBAL STATE INITIALIZATION ---
window.APP_STATE = window.APP_STATE || {
  currentView: 'auth', // 'auth' | 'shell'
  activeRole: 'guest',
  role: 'guest',
  activeShellRoute: 'dashboard',
  user: {
    id: 'usr_8891',
    username: 'Guest_000',
    balance: 0,
    tier: 'Observer',
  },
  isMaintenanceMode: false,
  ui: {
    selectedModule: null,
    activeDoc: null,
    authView: 'login',
  },
  lang: 'en',
};

function syncRole(role) {
  window.APP_STATE.activeRole = role;
  window.APP_STATE.role = role;
}

function setUserIdentity({ username, balance }) {
  // Supports partial updates.
  if (!window.APP_STATE.user) window.APP_STATE.user = {};
  if (username) window.APP_STATE.user.username = username;
  if (typeof balance === 'number' && Number.isFinite(balance)) window.APP_STATE.user.balance = balance;
}

function renderCurrentView() {
  const rootElement = document.getElementById('app_root');
  if (!rootElement) {
    console.error('[CRITICAL] #app_root element is missing from index.html');
    return;
  }

  if (window.APP_STATE.currentView === 'auth') {
    rootElement.innerHTML = window.renderAuthPortal ? window.renderAuthPortal() : '<div class="p-6 text-white">Auth module missing</div>';

    // Floating UI should exist even before login.
    if (typeof window.injectFloatingUI === 'function') window.injectFloatingUI();
    injectDevToolbar();
  } else {
    renderMainShell();
  }
}

// Expose a safe rerender hook for modules (documents, tables, etc.)
window.forceRerender = renderCurrentView;

// --- 2. GLOBAL ROUTER & NAVIGATION ---

/**
 * Handles all navigation requests within the application.
 * @param {string} destination - The target route or dashboard.
 * @param {object} roleObj - Optional object to override role/username/balance for mockup bypass.
 */
window.navigateTo = function (destination, roleObj = null) {
  // Update identity if provided (Mockup Bypass Logic)
  if (roleObj && roleObj.role) {
    syncRole(roleObj.role);
    // If userId is provided, hydrate from store.
    if (roleObj.userId && window.ROYAL_STORE && typeof window.ROYAL_STORE.getUserById === 'function') {
      const u = window.ROYAL_STORE.getUserById(roleObj.userId);
      if (u) {
        window.APP_STATE.user.id = u.id;
        window.APP_STATE.user.username = u.username;
        window.APP_STATE.user.balance = u.balanceCrown;
        window.APP_STATE.user.firstName = u.firstName;
        window.APP_STATE.user.lastName = u.lastName;
      }
    } else {
      if (roleObj.userId !== undefined) window.APP_STATE.user.id = roleObj.userId;
      setUserIdentity({
        username: roleObj.username,
        balance: (typeof roleObj.balance === 'number') ? roleObj.balance : undefined,
      });
    }
    console.log(`[AUTH] Identity shifted to: ${window.APP_STATE.role}`);
  }

  // Route Switching Logic
  if (destination === 'auth_login' || destination === 'auth_register') {
    window.APP_STATE.currentView = 'auth';
    renderCurrentView();
    if (destination === 'auth_register' && typeof window.switchAuthView === 'function') {
      window.switchAuthView('register');
    }
    return;
  }

  if (destination === 'guest_dashboard') {
    syncRole('guest');
    window.APP_STATE.currentView = 'shell';
    window.APP_STATE.activeShellRoute = 'smart_lobby';
    renderCurrentView();
    return;
  }

  // Standard shell routing
  window.APP_STATE.currentView = 'shell';
  window.APP_STATE.activeShellRoute = (destination.includes('dashboard')) ? 'dashboard' : destination;
  renderCurrentView();
};

/**
 * Updates the global language and triggers a UI re-render.
 */
window.setLanguage = function (lang) {
  window.APP_STATE.lang = lang;
  document.documentElement.lang = lang;

  const rtlLangs = ['ar', 'he'];
  document.documentElement.dir = rtlLangs.includes(lang) ? 'rtl' : 'ltr';

  console.log(`[SYSTEM] Language synchronized: ${lang}`);
  renderCurrentView();
};

// --- 3. MAIN UI SHELL RENDERER ---

function renderMainShell() {
  const rootElement = document.getElementById('app_root');

  if (typeof window.renderCommandCenter === 'function') {
    rootElement.innerHTML = window.renderCommandCenter(window.APP_STATE);

    // Inject route content
    injectDashboardContent();

    // Global modals
    injectGlobalModals();

    // Floating UI
    if (typeof window.injectFloatingUI === 'function') {
      window.injectFloatingUI();
    }

    // DEV toolbar
    injectDevToolbar();
  } else {
    console.error('[SYSTEM] Shell module (dashboards.js) failed to initialize.');
  }
}

// --- 4. VIEWPORT CONTENT INJECTION ---

function injectDashboardContent() {
  const contentArea = document.getElementById('dashboard_content_area');
  if (!contentArea) return;

  const state = window.APP_STATE;
  const route = state.activeShellRoute;
  const role = state.role;

  // Guest restriction
  if (role === 'guest' && route === 'dashboard') {
    contentArea.innerHTML = `
      <div class="poker-auth-card p-12 rounded-3xl text-center shadow-2xl max-w-2xl mx-auto mt-10 border-rcRed/30">
        <span class="text-6xl mb-6 block">🚫</span>
        <h2 class="text-rcRed font-black uppercase text-2xl mb-4 tracking-widest">${(window.t?window.t('access.restrictedTitle'):'Access Restricted')}</h2>
        <p class="text-rcSlateLight text-sm mb-8 leading-relaxed">
          ${(window.t?window.t('access.restrictedBody'):'Observer status detected. Private portfolios and secure gateways are locked. Please establish a verified identity to proceed with CROWN operations.')}
        </p>
        <button onclick="window.navigateTo('auth_register')" class="poker-chip-btn py-4 px-10 rounded-xl text-rcNavyBase font-black uppercase text-xs">
          ${(window.t?window.t('access.registerIdentity'):'Register Identity')}
        </button>
      </div>
    `;
    return;
  }

  // Route matching
  if (route === 'smart_lobby' && typeof window.renderSmartLobby === 'function') {
    contentArea.innerHTML = window.renderSmartLobby(state);
  } else if (route === 'waiting_lounge' && typeof window.renderWaitingLounge === 'function') {
    contentArea.innerHTML = window.renderWaitingLounge(state);
  } else if (route === 'poker_table' && typeof window.renderStrategicModule === 'function') {
    contentArea.innerHTML = window.renderStrategicModule(state);
  } else if (route === 'crypto_checkout' && typeof window.renderCryptoCheckout === 'function') {
    contentArea.innerHTML = window.renderCryptoCheckout(state);
  } else if (route === 'staff_chat' && typeof window.renderStaffChat === 'function') {
    contentArea.innerHTML = window.renderStaffChat(state);
  } else if (route === 'react_admin_god_view' && typeof window.renderReactAdminGodView === 'function') {
    contentArea.innerHTML = window.renderReactAdminGodView(state);
  } else if (route === 'dashboard') {
    // Role-based dashboard selection
    if (role === 'player' && typeof window.renderPlayerDashboard === 'function') {
      contentArea.innerHTML = window.renderPlayerDashboard(state);
    } else if ((role === 'admin' || role === 'root') && typeof window.renderAdminDashboard === 'function') {
      contentArea.innerHTML = window.renderAdminDashboard(state);
    } else {

      contentArea.innerHTML = `
        <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 max-w-2xl mx-auto mt-10">
          <div class="text-rcGold font-black uppercase tracking-widest text-[10px]">Route Loaded</div>
          <div class="text-white font-bold mt-2">No dashboard renderer mapped for role: <span class="text-rcGold">${role}</span></div>
        </div>
      `;
    }
  } else {
    contentArea.innerHTML = `
      <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 max-w-2xl mx-auto mt-10">
        <div class="text-rcSlateLight text-sm">Unknown route: <span class="text-white font-mono">${route}</span></div>
      </div>
    `;
  }
}

// --- 5. MODAL SYSTEM ---

function injectGlobalModals() {
  const rootElement = document.getElementById('app_root');
  const state = window.APP_STATE;

  // Allocation modal
  if (state.ui.selectedModule && typeof window.renderAllocationModal === 'function') {
    rootElement.insertAdjacentHTML('beforeend', window.renderAllocationModal(state));
  }

  // Documents modal
  if (state.ui.activeDoc && typeof window.renderDocumentModal === 'function') {
    rootElement.insertAdjacentHTML('beforeend', window.renderDocumentModal(state));
    if (typeof window.loadDocument === 'function') {
      window.loadDocument(state.ui.activeDoc, state);
    }
  }

  // User settings modal
  if (state.ui.userSettingsOpen && typeof window.renderUserSettingsModal === 'function') {
    rootElement.insertAdjacentHTML('beforeend', window.renderUserSettingsModal(state));
  }

  // Quick Buy modal (Crypto Checkout overlay)
  if (state.ui.quickBuyOpen && typeof window.renderQuickBuyModal === 'function') {
    rootElement.insertAdjacentHTML('beforeend', window.renderQuickBuyModal(state));
  }
}

// --- 6. DEVELOPER UTILITIES (MOCKUP BYPASS) ---

function injectDevToolbar() {
  const existing = document.getElementById('dev_toolbar');
  if (existing) existing.remove();

  const toolbar = document.createElement('div');
  toolbar.id = 'dev_toolbar';
  toolbar.className = 'dev-toolbar';

  toolbar.innerHTML = `
    <span style="opacity:0.6; font-family:monospace; margin-right:6px;">[DEV_ROLE]:</span>

    <button onclick="window.navigateTo('guest_dashboard', {role:'guest', username:'Guest_'+Math.floor(Math.random()*1000), balance:0})">Guest</button>
    <button onclick="window.navigateTo('player_dashboard', {role:'player', userId:'usr_p01'})">Player (120)</button>    <button onclick="window.navigateTo('admin_dashboard', {role:'admin', userId:'usr_admin'})">Admin</button>
    <button onclick="window.navigateTo('root_dashboard', {role:'root', userId:'usr_root'})">Root</button>

    <span style="opacity:0.35; margin:0 8px;">|</span>

    <button onclick="window.navigateTo('react_admin_god_view')" style="background:#0B223A; border:1px solid rgba(212,175,55,0.35); color:#D4AF37;">React God View</button>
    <button onclick="window.toggleGlobalSupportChat(true)" style="background:#111827; border:1px solid rgba(212,175,55,0.25); color:#D4AF37;">Open Chat</button>

    <span style="opacity:0.35; margin:0 8px;">|</span>

    <button onclick="window.navigateTo('auth_login', {role:'guest', username:'Guest_000', balance:0})" style="background:#fff; color:#dc2626; border:1px solid #dc2626;">AUTH</button>
  `;

  document.body.appendChild(toolbar);
}

// --- 7. BOOTSTRAP INITIALIZATION ---

window.initApp = function () {
  console.log('%c[SYSTEM] ROYAL MBOS v2.6 ENGINE - OPERATIONAL', 'color: #D4AF37; font-weight: bold; font-size: 12px;');

  // Default identity
  syncRole('guest');
  window.APP_STATE.user.id = null;
  setUserIdentity({ username: 'Guest_000', balance: 0 });

  // Start at login portal
  window.navigateTo('auth_login');
};

document.addEventListener('DOMContentLoaded', window.initApp);
