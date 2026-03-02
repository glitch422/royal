/**
 * ==========================================
 * ROYAL - USER SETTINGS MODAL (V2.0)
 * ==========================================
 * Permissions:
 * - Only PLAYER/ADMIN/ROOT may change username.
 * - Only PLAYER/ADMIN/ROOT may change first+last.
 * - Support, Admin, Admin Manager must contact ADMIN to change identity fields.
 * - Only players can change avatar (choose one of 8).
 */

(function () {
  function role() {
    const s = window.APP_STATE || {};
    return String(s.role || s.activeRole || 'guest').toLowerCase();
  }

  function currentUserId() {
    const s = window.APP_STATE || {};
    return (s.user && s.user.id) ? s.user.id : null;
  }

  function getStore() {
    return window.ROYAL_STORE;
  }

  function canEditIdentitySelf(r) {
    return ['player', 'admin', 'root'].includes(String(r || '').toLowerCase());
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.openUserSettings = function () {
    window.APP_STATE.ui = window.APP_STATE.ui || {};
    window.APP_STATE.ui.userSettingsOpen = true;
    if (typeof window.forceRerender === 'function') window.forceRerender();
  };

  window.closeUserSettings = function () {
    window.APP_STATE.ui.userSettingsOpen = false;
    if (typeof window.forceRerender === 'function') window.forceRerender();
  };

  window.renderUserSettingsModal = function (stateObj) {
    const t = window.t || ((k)=>k);
    if (!stateObj.ui || !stateObj.ui.userSettingsOpen) return '';

    const r = role();
    if (r === 'guest') {
      return `
        <div class="fixed inset-0 bg-rcNavyBase/95 backdrop-blur-md z-[250] flex items-center justify-center p-4" onclick="window.closeUserSettings()">
          <div class="glass-panel p-8 rounded-3xl max-w-xl w-full border border-rcGold/30" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-6">
              <div class="text-rcGold font-black uppercase tracking-widest">${t('profile.title')}</div>
              <button class="text-rcSlate hover:text-white text-xl" onclick="window.closeUserSettings()">✕</button>
            </div>
            <div class="bg-rcRed/10 border border-rcRed/30 p-5 rounded-2xl text-center">
              <div class="text-4xl mb-3">🚫</div>
              <div class="text-white font-black uppercase tracking-widest">Guest has no profile</div>
              <div class="text-rcSlateLight text-xs mt-2">Register to create an identity and wallet.</div>
              <button onclick="window.closeUserSettings(); window.navigateTo('auth_register')" class="mt-6 poker-chip-btn px-6 py-3 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">Register</button>
            </div>
          </div>
        </div>
      `;
    }

    const store = getStore();
    const uid = currentUserId();
    const user = store ? store.getUserById(uid) : null;

    const canEdit = canEditIdentitySelf(r);

    const avatarSrc = (window.ROYAL_AVATARS && window.ROYAL_AVATARS.avatarPathForUser) ? window.ROYAL_AVATARS.avatarPathForUser(user || stateObj.user) : 'assets/avatars/player1.jpeg';

    const disabledHint = `This role cannot change identity fields. Contact ADMIN.`;

    const usernameInput = `
      <div>
        <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${t('profile.username')}</label>
        <input id="us_username" ${canEdit ? '' : 'disabled'} value="${escapeHtml(user ? user.username : stateObj.user.username)}"
          class="mt-2 w-full poker-input p-3 rounded-xl text-sm ${canEdit ? '' : 'opacity-50 cursor-not-allowed'}" placeholder="username">
        ${canEdit ? '' : `<div class="text-[10px] text-rcSlateLight mt-2">${disabledHint}</div>`}
      </div>
    `;

    const nameInputs = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${t('profile.firstName')}</label>
          <input id="us_first" ${canEdit ? '' : 'disabled'} value="${escapeHtml(user ? user.firstName : '')}" class="mt-2 w-full poker-input p-3 rounded-xl text-sm ${canEdit ? '' : 'opacity-50 cursor-not-allowed'}" placeholder="${t('profile.firstName')}">
        </div>
        <div>
          <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${t('profile.lastName')}</label>
          <input id="us_last" ${canEdit ? '' : 'disabled'} value="${escapeHtml(user ? user.lastName : '')}" class="mt-2 w-full poker-input p-3 rounded-xl text-sm ${canEdit ? '' : 'opacity-50 cursor-not-allowed'}" placeholder="${t('profile.lastName')}">
        </div>
      </div>
      ${canEdit ? '' : `<div class="text-[10px] text-rcSlateLight mt-2">${disabledHint}</div>`}
    `;

    const avatarPicker = (user && user.role === 'player') ? renderAvatarPicker(user.avatarKey) : `
      <div class="text-[10px] text-rcSlateLight">Avatar is fixed for this staff role.</div>
    `;

    const promoBlock = `
      <div class="bg-rcNavyBase border border-rcNavyBorder p-4 rounded-2xl">
        <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">No promos</div>
        <div class="text-rcSlateLight text-xs mt-2">${t('profile.logoutInfo') || 'Logout is always available.'}</div>
      </div>
    `;

    return `
      <div class="fixed inset-0 bg-rcNavyBase/95 backdrop-blur-md z-[250] flex items-center justify-center p-4" onclick="window.closeUserSettings()">
        <div class="glass-panel p-7 md:p-10 rounded-3xl max-w-3xl w-full border border-rcGold/30 shadow-[0_0_50px_rgba(0,0,0,0.8)]" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
              <img src="${avatarSrc}" class="w-14 h-14 rounded-full border border-rcGold/40 object-cover shadow-lg"/>
              <div>
                <div class="text-white font-black text-xl">${t('profile.settings')}</div>
                <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${r}</div>
              </div>
            </div>
            <button class="text-rcSlate hover:text-white text-2xl" onclick="window.closeUserSettings()">✕</button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-6">
              ${usernameInput}
              ${nameInputs}

              <div>
                <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Password (self change allowed)</label>
                <input id="us_password" type="password" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="New password">
              </div>

              <div class="flex gap-3">
                <button onclick="window.saveUserSettings()" class="flex-1 poker-chip-btn py-3 rounded-xl text-rcNavyBase font-black uppercase text-[10px] tracking-widest">Save</button>
                <button onclick="window.closeUserSettings()" class="flex-1 bg-rcNavyPanel border border-rcNavyBorder text-rcSlateLight hover:text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest">Close</button>
              </div>

              <div class="bg-rcNavyBase border border-rcNavyBorder p-4 rounded-2xl">
                <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Avatar</div>
                <div class="mt-3">${avatarPicker}</div>
              </div>
            </div>

            <div class="space-y-6">
              ${promoBlock}

              <div class="bg-rcNavyBase border border-rcNavyBorder p-4 rounded-2xl">
                <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Identity policy</div>
                <ul class="mt-3 text-rcSlateLight text-xs space-y-2">
                  <li>Only Player, Admin, and Root can change username and full name.</li>
                  <li>Support, Admin, and Admin Manager must contact Admin to change identity fields.</li>
                  <li>Players can switch between 8 personal avatars.</li>
                </ul>
              </div>

              <button onclick="window.safeLogout()" id="btn_logout" class="w-full bg-rcRed/10 border border-rcRed/40 text-rcRed hover:bg-rcRed hover:text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
                Logout
              </button>
              
            </div>
          </div>
        </div>
      </div>
    `;
  };

  function renderAvatarPicker(selectedKey) {
    const opts = (window.ROYAL_AVATARS && window.ROYAL_AVATARS.avatarPickerOptions) ? window.ROYAL_AVATARS.avatarPickerOptions() : [];
    return `
      <div class="grid grid-cols-4 gap-3">
        ${opts.map(o => `
          <button onclick="window.selectAvatar('${o.key}')" class="p-1 rounded-2xl border ${o.key === selectedKey ? 'border-rcGold' : 'border-rcNavyBorder'} hover:border-rcGold/60 transition-all">
            <img src="${o.src}" class="w-14 h-14 rounded-xl object-cover"/>
            <div class="text-[8px] text-center mt-2 font-black uppercase tracking-widest ${o.key === selectedKey ? 'text-rcGold' : 'text-rcSlateLight'}">${o.key}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  window.selectAvatar = function (key) {
    const store = getStore();
    const uid = currentUserId();
    if (!store || !uid) return;
    try {
      store.setPlayerAvatar(uid, key);
      const u = store.getUserById(uid);
      if (u) {
        window.APP_STATE.user.username = u.username;
        window.APP_STATE.user.balance = u.balanceCrown;
      }
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      alert(String(e.message || e));
    }
  };

  window.saveUserSettings = function () {
    const store = getStore();
    const uid = currentUserId();
    const r = role();
    if (!store || !uid) return;

    const canEdit = canEditIdentitySelf(r);

    const username = (document.getElementById('us_username') || {}).value;
    const firstName = (document.getElementById('us_first') || {}).value;
    const lastName = (document.getElementById('us_last') || {}).value;
    const password = (document.getElementById('us_password') || {}).value;

    try {
      if (canEdit) {
        store.updateUserIdentity(r, uid, { isSelf: true, username, firstName, lastName });
      }
      if (password && String(password).trim().length >= 4) {
        store.changeOwnPassword(uid, String(password).trim());
      }

      const u = store.getUserById(uid);
      if (u) {
        window.APP_STATE.user.username = u.username;
        window.APP_STATE.user.balance = u.balanceCrown;
      }

      alert(t('common.saved'));
      if (typeof window.forceRerender === 'function') window.forceRerender();
    } catch (e) {
      alert(String(e.message || e));
    }
  };

  window.safeLogout = function () {
    window.closeUserSettings();
    window.navigateTo('auth_login', { role: 'guest', username: 'Guest_000', balance: 0, userId: null });
  };

  function fmtMs(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // No promo countdown.
})();
