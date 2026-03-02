/**
 * ==========================================
 * ROYAL - AUTHENTICATION MODULE (V2.5-i18n)
 * ==========================================
 * High-stakes visual redesign with Guest access.
 * Updates:
 * - i18n for all visible UI strings + alerts
 * - Language selector on Login + Register
 */

function authLangSelect() {
  const lang = (window.APP_STATE && window.APP_STATE.lang) ? window.APP_STATE.lang : 'en';
  return `
    <select onchange="window.setLanguage(this.value)" class="bg-rcNavyBase/70 border border-rcNavyBorder text-rcGold text-[9px] font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer hover:border-rcGold transition-all uppercase tracking-widest">
      <option value="he" ${lang==='he'?'selected':''}>עברית</option>
      <option value="ar" ${lang==='ar'?'selected':''}>العربية</option>
      <option value="en" ${lang==='en'?'selected':''}>English</option>
      <option value="fr" ${lang==='fr'?'selected':''}>Français</option>
      <option value="ru" ${lang==='ru'?'selected':''}>Русский</option>
    </select>
  `;
}

window.renderAuthPortal = function () {
  const view = (window.APP_STATE && window.APP_STATE.ui && window.APP_STATE.ui.authView) ? window.APP_STATE.ui.authView : 'login';
  return (view === 'register') ? renderRegisterView() : renderLoginView();
};

window.switchAuthView = function (view) {
  if (window.APP_STATE && window.APP_STATE.ui) window.APP_STATE.ui.authView = view;
  const container = document.getElementById('auth_container');
  if (!container) return;

  container.classList.remove('fade-in');
  container.classList.add('opacity-0', 'transition-opacity', 'duration-300');

  setTimeout(() => {
    container.innerHTML = (view === 'login') ? renderLoginViewContent() : renderRegisterViewContent();
    container.classList.remove('opacity-0');
    container.classList.add('fade-in');
  }, 250);
};

function langCorner() {
  const rtl = (window.APP_STATE && (window.APP_STATE.lang === 'ar' || window.APP_STATE.lang === 'he'));
  return rtl ? 'left-6' : 'right-6';
}

function renderLoginView() {
  return `
    <div class="w-full h-full flex items-center justify-center p-4 relative">
      <div class="absolute top-6 ${langCorner()} z-10">${authLangSelect()}</div>
      <div id="auth_container" class="fade-in w-full max-w-md">
        ${renderLoginViewContent()}
      </div>
    </div>
  `;
}

function renderRegisterView() {
  return `
    <div class="w-full h-full flex items-center justify-center p-4 relative">
      <div class="absolute top-6 ${langCorner()} z-10">${authLangSelect()}</div>
      <div id="auth_container" class="fade-in w-full max-w-md">
        ${renderRegisterViewContent()}
      </div>
    </div>
  `;
}

function renderLoginViewContent() {
  const t = window.t || ((k) => k);
  return `
    <div class="poker-auth-card rounded-3xl p-8 relative overflow-hidden">
      <div class="text-center mb-10 relative">
        <div class="absolute top-1/2 -translate-y-1/2 left-4 text-5xl text-rcGold/20 rotate-[-15deg] pointer-events-none select-none">♠<br><span class="text-2xl block -mt-2 ml-1">A</span></div>
        <div class="absolute top-1/2 -translate-y-1/2 right-4 text-5xl text-rcRed/20 rotate-[15deg] pointer-events-none select-none">♥<br><span class="text-2xl block -mt-2 ml-2">A</span></div>

        <h1 class="royal-logo text-5xl mb-3">ROYAL</h1>
        <p class="text-rcSlateLight text-[10px] font-mono uppercase tracking-[0.3em] font-bold">${t('auth.portalTitle')}</p>
      </div>

      <div class="space-y-5 relative z-10">
        <div>
          <label class="text-[9px] text-rcGold uppercase font-bold tracking-widest block mb-2">${t('auth.operativeId')}</label>
          <input type="text" id="login_uid" class="poker-input w-full p-4 rounded-xl text-white text-sm outline-none font-mono" placeholder="${t('auth.usernamePh')}">
        </div>
        <div>
          <label class="text-[9px] text-rcGold uppercase font-bold tracking-widest block mb-2">${t('auth.secureClearance')}</label>
          <input type="password" id="login_pass" class="poker-input w-full p-4 rounded-xl text-white text-sm outline-none font-mono" placeholder="••••••••">
        </div>

        <button onclick="window.handleLogin()" class="poker-chip-btn w-full py-4 rounded-2xl uppercase tracking-[0.2em] text-xs font-black text-rcNavyBase relative overflow-hidden group">
          ${t('auth.authEnter')}
        </button>

        <div class="flex items-center gap-4 py-2">
          <div class="flex-grow h-[1px] bg-rcNavyBorder"></div>
          <span class="text-[8px] text-rcSlate uppercase font-bold">${t('auth.or')}</span>
          <div class="flex-grow h-[1px] bg-rcNavyBorder"></div>
        </div>

        <button onclick="window.executeGuestLogin()" class="w-full bg-transparent border border-rcSlate/30 hover:border-rcGold text-rcSlateLight hover:text-rcGold py-3 rounded-xl uppercase tracking-widest text-[9px] font-bold transition-all">
          ${t('auth.guestEnter')}
        </button>
      </div>

      <div class="mt-8 text-center relative z-10">
        <button onclick="window.switchAuthView('register')" class="text-rcGold hover:text-white border-b border-rcGold/30 hover:border-white pb-1 text-[10px] uppercase font-black tracking-widest transition-all">
          ${t('auth.newIdentity')}
        </button>
      </div>
    </div>
  `;
}

function renderRegisterViewContent() {
  const t = window.t || ((k) => k);
  return `
    <div class="poker-auth-card rounded-3xl p-8 relative overflow-hidden">
      <div class="text-center mb-8 relative">
        <div class="absolute top-1/2 -translate-y-1/2 left-2 text-4xl text-rcGold/20 rotate-[-10deg] pointer-events-none">♣<br><span class="text-xl block -mt-1 ml-1">A</span></div>
        <div class="absolute top-1/2 -translate-y-1/2 right-2 text-4xl text-rcRed/20 rotate-[10deg] pointer-events-none">♦<br><span class="text-xl block -mt-1 ml-1">A</span></div>
        <h1 class="royal-logo text-4xl mb-2">ROYAL</h1>
        <p class="text-rcSlateLight text-[10px] font-mono uppercase font-bold">${t('auth.identityCreation')}</p>
      </div>

      <div class="space-y-4 relative z-10">
        <div class="grid grid-cols-2 gap-3">
          <input type="text" id="reg_fname" placeholder="${t('auth.firstName')}" class="poker-input w-full p-3 rounded-xl text-white text-xs outline-none">
          <input type="text" id="reg_lname" placeholder="${t('auth.lastName')}" class="poker-input w-full p-3 rounded-xl text-white text-xs outline-none">
        </div>

        <div class="flex gap-2 items-start bg-black/40 p-2.5 rounded-lg border border-rcGold/10">
          <span class="text-rcGold text-lg">⚖️</span>
          <p class="text-[7px] text-rcSlateLight leading-tight italic">
            <strong class="text-rcGold uppercase">${t('auth.privacyProtocolTitle')}</strong> ${t('auth.privacyProtocolBody')}
          </p>
        </div>

        <input type="text" id="reg_uname" placeholder="${t('auth.aliasVisible')}" class="poker-input w-full p-3 rounded-xl text-white text-xs outline-none font-mono">
        <input type="password" id="reg_pass1" placeholder="${t('auth.password')}" class="poker-input w-full p-3 rounded-xl text-white text-xs outline-none">

        <button onclick="window.handleRegister()" class="poker-chip-btn w-full py-4 rounded-2xl uppercase tracking-widest text-xs font-black text-rcNavyBase mt-2">
          ${t('auth.finalize')}
        </button>

        <button onclick="window.executeGuestLogin()" class="w-full bg-transparent border border-rcSlate/30 hover:border-rcGold text-rcSlateLight hover:text-rcGold py-3 rounded-xl uppercase tracking-widest text-[9px] font-bold transition-all">
          ${t('auth.guestEnter')}
        </button>
      </div>

      <div class="mt-6 text-center">
        <button onclick="window.switchAuthView('login')" class="text-rcSlateLight hover:text-rcGold text-[9px] uppercase font-bold tracking-widest transition-all">
          ${t('auth.returnLogin')}
        </button>
      </div>
    </div>
  `;
}

// --- AUTH LOGIC ---

window.handleLogin = function () {
  const t = window.t || ((k) => k);

  const uid = (document.getElementById('login_uid') || {}).value;
  const pass = (document.getElementById('login_pass') || {}).value;
  if (!uid || !pass) return alert(t('auth.errEnterUserPass'));

  const store = window.ROYAL_STORE;
  if (!store || typeof store.authenticateUser !== 'function') {
    alert(t('auth.errStoreNotReady'));
    return;
  }

  try {
    const u = store.authenticateUser({ username: uid, password: pass });
    const dest = (u.role === 'player') ? 'player_dashboard' : (u.role === 'admin' ? 'admin_dashboard' : 'root_dashboard');
    window.navigateTo(dest, { role: u.role, userId: u.id });
  } catch (e) {
    alert(String(e.message || e));
  }
};

window.executeGuestLogin = function () {
  console.log('[SYSTEM] Entering as anonymous guest.');
  window.navigateTo('guest_dashboard', { role: 'guest', username: 'Guest_' + Math.floor(Math.random() * 1000), balance: 0 });
};

window.handleRegister = function () {
  const t = window.t || ((k) => k);

  const firstName = (document.getElementById('reg_fname') || {}).value;
  const lastName = (document.getElementById('reg_lname') || {}).value;
  const uname = (document.getElementById('reg_uname') || {}).value;
  const pass = (document.getElementById('reg_pass1') || {}).value;

  if (!uname) return alert(t('auth.errAliasRequired'));
  if (!pass) return alert(t('auth.errPasswordRequired'));

  const store = window.ROYAL_STORE;
  if (!store || typeof store.publicRegister !== 'function') {
    alert(t('auth.errStoreNotReady'));
    return;
  }

  try {
    const u = store.publicRegister({ username: uname, password: pass, firstName, lastName });
    window.navigateTo('player_dashboard', { role: 'player', userId: u.id });
  } catch (e) {
    alert(String(e.message || e));
  }
};
