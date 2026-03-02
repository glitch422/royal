/**
 * ==========================================
 * ROYAL - COMMAND CENTER SHELL (V2.2-i18n)
 * ==========================================
 * High-stakes UI wrapper.
 * Updates:
 * - Full i18n for main shell + sidebar
 * - Header language selector
 * - Locale-aware numbers
 */

window.renderCommandCenter = function (stateObj) {
  const t = window.t || ((k) => k);
  const fmt = window.formatNumber || ((n) => Number(n || 0).toLocaleString());

  const dir = (stateObj.lang === 'ar' || stateObj.lang === 'he') ? 'rtl' : 'ltr';
  const role = stateObj.role || stateObj.activeRole;
  const isGuest = role === 'guest';

  const store = window.ROYAL_STORE;
  const site = (store && store.getSiteStatus)
    ? store.getSiteStatus()
    : { siteOpenNow: true, scheduleEnabled: false, timezone: 'local' };

  const u = (store && stateObj.user && stateObj.user.id) ? store.getUserById(stateObj.user.id) : null;
  const avatarSrc = (!isGuest && window.ROYAL_AVATARS && window.ROYAL_AVATARS.avatarPathForUser)
    ? window.ROYAL_AVATARS.avatarPathForUser(u || stateObj.user)
    : '';
  const displayName = (u && u.firstName) ? `${u.firstName} ${u.lastName}` : '';

  const langSelect = (window.ROYAL_I18N && window.ROYAL_I18N.renderLangSelect)
    ? window.ROYAL_I18N.renderLangSelect({
        className: 'bg-rcNavyBase border border-rcNavyBorder text-rcGold text-[9px] font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer hover:border-rcGold transition-all uppercase tracking-widest'
      })
    : `<div class="bg-rcNavyBase border border-rcNavyBorder text-rcGold text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest">${String(stateObj.lang || 'EN').toUpperCase()}</div>`;

  return `
    <div class="flex h-screen w-full bg-transparent overflow-hidden font-sans" dir="${dir}">
      <aside class="w-64 bg-rcNavyPanel/90 backdrop-blur-xl border-r border-rcNavyBorder flex flex-col z-30 shadow-2xl">
        <div class="p-6 border-b border-rcNavyBorder flex flex-col items-center">
          <img src="assets/logo_and_favicon.png" alt="ROYAL" class="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.25)]" />
          <h1 class="royal-logo text-3xl -mt-1">ROYAL</h1>
          <span class="text-[8px] text-rcGold font-black uppercase tracking-[0.3em]">${t('shell.premiumPlatform')}</span>
        </div>

        <nav class="flex-grow p-4 overflow-y-auto custom-scrollbar">
          ${getSidebarLinks(stateObj)}
        </nav>

        <div class="p-4 border-t border-rcNavyBorder bg-black/20">
          <div class="mb-4 p-3 rounded-2xl border border-rcNavyBorder bg-rcNavyBase/60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span id="rcLiveDot" class="text-rcGreen text-xs">●</span>
                <span class="text-white text-[10px] font-black uppercase tracking-widest">${t('shell.live')}</span>
              </div>
              <span id="rcLiveClock" class="text-rcSlateLight text-[10px] font-mono">--:--:--</span>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-rcSlateLight text-[10px]">${t('shell.status')}</span>
              <span class="${site.siteOpenNow ? 'text-rcGreen' : 'text-rcRed'} text-[10px] font-black uppercase tracking-widest">${site.siteOpenNow ? t('shell.open') : t('shell.closed')}</span>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-rcSlateLight text-[10px]">${t('shell.latency')}</span>
              <span id="rcLiveLatency" class="text-rcGold text-[10px] font-black">--ms</span>
            </div>
          </div>

          <div class="flex items-center gap-3 mb-4">
            ${isGuest ? `<div class="w-10 h-10 rounded-full border border-rcNavyBorder bg-rcNavyBase flex items-center justify-center text-rcGold">👁️</div>` : `<button onclick="window.openUserSettings()" class="relative" title="${t('profile.settings')}">
              <img src="${avatarSrc}" class="w-10 h-10 rounded-full border border-rcGold shadow-lg object-cover">
            </button>`}
            <div class="overflow-hidden">
              <p class="text-white text-[10px] font-bold truncate">@${stateObj.user.username}</p>
              <p class="text-rcGold text-[8px] uppercase font-black">${role}${displayName ? ` • ${displayName}` : ''}</p>
            </div>
          </div>

          <button onclick="window.navigateTo('auth_login')" class="w-full py-2 bg-rcNavyBase border border-rcRed/30 text-rcRed hover:bg-rcRed hover:text-white rounded text-[9px] font-bold uppercase transition-all">${t('shell.terminate')}</button>
        </div>
      </aside>

      <main class="flex-grow flex flex-col relative z-10 overflow-hidden">
        <header class="h-16 bg-rcNavyPanel/50 backdrop-blur-md border-b border-rcNavyBorder flex items-center justify-between px-8 shrink-0">
          <div class="flex items-center gap-6">
            <span class="text-rcSlate text-[10px] font-mono uppercase tracking-widest hidden md:block">${t('shell.systemStatus')}: <span class="text-rcGreen animate-pulse">${t('shell.operational')}</span></span>
          </div>

          <div class="flex items-center gap-4">
            ${langSelect}

            ${!isGuest ? `<div class="bg-rcNavyBase border border-rcGold/30 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
              <img src="assets/crown_icon.png" class="w-4 h-4" alt="CROWN"/>
              <span class="text-rcGold text-[10px] font-black font-mono">${fmt(Number(stateObj.user.balance || 0))} CROWN</span>
            </div>` : ''}
          </div>
        </header>

        <section id="dashboard_content_area" class="flex-grow overflow-y-auto custom-scrollbar p-8 bg-transparent"></section>
      </main>
    </div>
  `;
};

function getSidebarLinks(stateObj) {
  const t = window.t || ((k) => k);

  const role = stateObj.role || stateObj.activeRole;
  const isStaff = ['admin', 'root'].includes(role);
  const store = window.ROYAL_STORE;

  let canOpenTable = false;
  if (isStaff) {
    canOpenTable = true;
  } else if (role === 'player') {
    const uid = (stateObj.user || {}).id;
    canOpenTable = !!(store && uid && typeof store.isUserSeatedAtTable === 'function' && store.isUserSeatedAtTable(uid, 'tbl_main'));
  }

  const tableLink = canOpenTable
    ? `<button onclick="window.navigateTo('poker_table')" class="sidebar-link mb-2">🎲 ${t('nav.table')}</button>`
    : (role === 'player'
        ? `<button onclick="window.navigateTo('smart_lobby')" class="sidebar-link mb-2">🪑 ${t('nav.takeSeat')}</button>`
        : '');

  return `
    <button onclick="window.navigateTo('smart_lobby')" class="sidebar-link mb-2">🏛️ ${t('nav.lobby')}</button>
    ${role !== 'guest' ? `<button onclick="window.navigateTo('player_dashboard')" class="sidebar-link mb-2">📊 ${t('nav.dashboard')}</button>` : ''}
    ${isStaff ? `<button onclick="window.navigateTo('react_admin_god_view')" class="sidebar-link mb-2">👁️ ${t('nav.godView')}</button>` : ''}
    ${tableLink}
    <div class="my-4 border-t border-rcNavyBorder/50"></div>
    <button onclick="window.openDocumentModal('hub')" class="sidebar-link !text-rcSlate">📜 ${t('shell.documents')}</button>
  `;
}

// Internal CSS for Sidebar Links
const style = document.createElement('style');
style.innerText = `
  .sidebar-link {
    width: 100%; text-align: left; padding: 12px 16px; border-radius: 8px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #94a3b8; transition: all 0.2s; border: 1px solid transparent; display: block;
  }
  .sidebar-link:hover { background: rgba(212, 175, 55, 0.1); color: #D4AF37; border-color: rgba(212, 175, 55, 0.2); }
  [dir="rtl"] .sidebar-link { text-align: right; }
`;
document.head.appendChild(style);
