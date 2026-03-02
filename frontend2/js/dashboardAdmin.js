/**
 * ==========================================
 * ROYAL - ADMIN / ROOT DASHBOARD (V4.0)
 * ==========================================
 * War-room operations:
 * - Create users (Admin button). Root can create Admin.
 * - Manage users: delete, role, password, freeze/ban/unban, unfreeze
 * - Player wallet ops: grant, burn, drain
 * - Global withdrawals toggle (kill switch)
 * - Kick players from tables
 */

(function(){
  function getStore(){ return window.ROYAL_STORE; }
  function role(stateObj){ return String(stateObj.role||stateObj.activeRole||'guest').toLowerCase(); }
  function fmt(n,d=2){ const x=Number(n||0); if(!Number.isFinite(x)) return '0'; if(window.formatNumber) return window.formatNumber(x,{minimumFractionDigits:d,maximumFractionDigits:d}); return x.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.renderAdminDashboard = function(stateObj){
    const t = window.t || ((k)=>k);
    const r = role(stateObj);
    if (!['admin','root'].includes(r)) {
      return `
        <div class="poker-auth-card p-10 rounded-3xl max-w-2xl mx-auto border border-rcRed/30 text-center">
          <div class="text-5xl mb-6">🚫</div>
          <div class="text-white font-black text-2xl uppercase tracking-widest">${t('adminDash.adminCommand')}</div>
          <div class="text-rcSlateLight text-sm mt-3">${t('adminDash.adminHint')}</div>
        </div>
      `;
    }

    const store = getStore();
    const cfg = store.loadConfig();

    stateObj.ui = stateObj.ui || {};
    if (stateObj.ui.adminSearch === undefined) stateObj.ui.adminSearch = '';
    if (!stateObj.ui.adminRoleFilter) stateObj.ui.adminRoleFilter = 'all';

    const users = store.loadUsers();

    let filtered = users;
    if (stateObj.ui.adminRoleFilter !== 'all') filtered = filtered.filter(u => u.role === stateObj.ui.adminRoleFilter);
    if (String(stateObj.ui.adminSearch||'').trim()) {
      const q = String(stateObj.ui.adminSearch).toLowerCase();
      filtered = filtered.filter(u => (u.username||'').toLowerCase().includes(q) || (u.firstName||'').toLowerCase().includes(q) || (u.lastName||'').toLowerCase().includes(q) || (u.id||'').toLowerCase().includes(q));
    }

    filtered = filtered.slice(0, 60);

    const playersOnline = store.listOnlinePlayers().length;
    const tables = store.listTables();
    const pendingW = store.loadWithdrawals().filter(w=>w.status==='requested').length;

    const modal = stateObj.ui.adminUserModalOpen ? renderManageUserModal(stateObj) : '';
    const createModal = stateObj.ui.adminCreateOpen ? renderCreateUserModal(stateObj) : '';

    return `
      <div class="max-w-7xl mx-auto fade-in">
        <div class="flex items-end justify-between mb-8">
          <div>
            <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${r === 'root' ? t('adminDash.rootTag') : t('adminDash.adminTag')}</div>
            <div class="text-white font-black text-4xl mt-2">${t('adminDash.warRoom')}</div>
            <div class="text-rcSlateLight text-sm mt-2">${t('adminDash.subtitle')}</div>
          </div>
          <div class="flex gap-3">
            <button onclick="window.openCreateUser()" class="poker-chip-btn px-5 py-3 rounded-2xl text-rcNavyBase font-black uppercase tracking-widest text-[10px]">${t('adminDash.createUser')}</button>
            <button onclick="window.navigateTo('react_admin_god_view')" class="bg-rcNavyPanel border border-rcGold/20 text-rcGold px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">GOD VIEW</button>
            <button onclick="window.toggleWithdrawalsAdmin()" class="${cfg.withdrawalsActive ? 'bg-rcGreen/10 border-rcGreen/30 text-rcGreen' : 'bg-rcRed/10 border-rcRed/30 text-rcRed'} border px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">${t('adminDash.withdrawals')}: ${cfg.withdrawalsActive ? t('adminDash.on') : t('adminDash.off')}</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          ${kpi(t('adminDash.onlinePlayers'), playersOnline, 'text-rcGold')}
          ${kpi(t('adminDash.tables'), tables.length, 'text-white')}
          ${kpi(t('adminDash.pendingWithdrawals'), pendingW, 'text-rcGold')}
          ${kpi(t('adminDash.crownUsd'), `$${fmt(cfg.crownUsdRate,2)}`, 'text-rcGold')}
        </div>


        <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-6 mb-8">
          <div class="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div class="text-white font-black uppercase tracking-widest text-sm">${t('adminDash.weeklySchedule')}</div>
              <div class="text-rcSlateLight text-xs mt-1">${t('adminDash.scheduleLine')} <span class="text-white">${escapeHtml(cfg.timezone || 'local')}</span></div>
            </div>
            <div class="flex gap-2 items-center">
              <button onclick="window.toggleScheduleEnabledAdmin()" class="${cfg.scheduleEnabled ? 'bg-rcGreen/10 border-rcGreen/30 text-rcGreen' : 'bg-rcRed/10 border-rcRed/30 text-rcRed'} border px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                ${t('adminDash.schedule')}: ${cfg.scheduleEnabled ? t('adminDash.on') : t('adminDash.off')}
              </button>
              <select onchange="window.setTimezoneAdmin(this.value)" class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl px-3 py-2 text-white text-xs">
                ${['Asia/Jerusalem','UTC','Europe/Paris','Europe/Moscow','America/New_York'].map(tz=>`<option value="${tz}" ${String(cfg.timezone||'')===tz?'selected':''}>${tz}</option>`).join('')}
              </select>
              <button onclick="window.saveScheduleAdmin()" class="poker-chip-btn px-4 py-2 rounded-2xl text-rcNavyBase font-black uppercase tracking-widest text-[10px]">${t('adminDash.save')}</button>
              <div class="ml-3 text-xs text-rcSlateLight">${t('adminDash.maxDeposit')}</div>
              <input id="max_dep" value="${escapeHtml(String(cfg.maxDepositPerUserUSDT || '0'))}" placeholder="${t('adminDash.unlimitedHint')}" class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl px-3 py-2 text-white text-xs w-32" />
            </div>
          </div>

          <div class="mt-5 overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-rcSlateLight">
                  <th class="text-left py-2">${t('adminDash.day')}</th>
                  <th class="text-left py-2">${t('adminDash.enabled')}</th>
                  <th class="text-left py-2">${t('adminDash.open')}</th>
                  <th class="text-left py-2">${t('adminDash.close')}</th>
                  <th class="text-left py-2">${t('adminDash.notes')}</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['Sunday',0],['Monday',1],['Tuesday',2],['Wednesday',3],['Thursday',4],['Friday',5],['Saturday',6]
                ].map(([name,day])=>{
                  const row = (cfg.weeklySchedule && cfg.weeklySchedule[day]) ? cfg.weeklySchedule[day] : {enabled:true,open:'18:00',close:'02:00'};
                  return `
                    <tr class="border-t border-rcNavyBorder/60">
                      <td class="py-3 text-white font-bold">${name}</td>
                      <td class="py-3">
                        <input id="sch_en_${day}" type="checkbox" ${row.enabled?'checked':''} class="w-4 h-4 accent-rcGold">
                      </td>
                      <td class="py-3">
                        <input id="sch_open_${day}" value="${escapeHtml(row.open||'')}" placeholder="HH:MM" class="bg-rcNavyBase border border-rcNavyBorder rounded-xl px-3 py-2 text-white w-28">
                      </td>
                      <td class="py-3">
                        <input id="sch_close_${day}" value="${escapeHtml(row.close||'')}" placeholder="HH:MM" class="bg-rcNavyBase border border-rcNavyBorder rounded-xl px-3 py-2 text-white w-28">
                      </td>
                      <td class="py-3 text-rcSlateLight">
                        ${row.open && row.close && row.close < row.open ? t('adminDash.crossMidnight') : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="text-rcSlateLight text-xs mt-4">
            ${t('adminDash.closureRule')}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-7 shadow-inner">
              <div class="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('adminDash.userManagement')}</div>
                  <div class="text-white font-black text-2xl mt-2">${t('adminDash.directory')}</div>
                </div>
                <div class="flex gap-2">
                  <select onchange="window.setAdminRoleFilter(this.value)" class="bg-rcNavyBase border border-rcNavyBorder text-white p-2 rounded-xl text-[10px]">
                    ${roleOptions(r).map(o => `<option value="${o}" ${stateObj.ui.adminRoleFilter===o?'selected':''}>${o.toUpperCase()}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="mb-5">
                <input value="${escapeHtml(stateObj.ui.adminSearch)}" oninput="window.setAdminSearch(this.value)" class="w-full poker-input p-3 rounded-2xl text-sm" placeholder="${t('adminDash.searchPlaceholder')}"/>
              </div>

              ${renderUserTable(filtered, r)}
            </div>
          </div>

          <div class="space-y-8">
            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-7 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('adminDash.enforcement')}</div>
              <div class="text-white font-black text-2xl mt-2">${t('adminDash.quickActions')}</div>

              <div class="mt-6 space-y-3">
</div>

              <div class="mt-6 bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-5">
                <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('adminDash.securityPosture')}</div>
                <div class="text-rcSlateLight text-sm mt-2">${t('adminDash.securityBody')}</div>
              </div>
            </div>

            <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-3xl p-7 shadow-inner">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('adminDash.tables')}</div>
              <div class="text-white font-black text-2xl mt-2">${t('adminDash.openKick')}</div>
              <div class="text-rcSlateLight text-sm mt-2">${t('adminDash.openKickBody')}</div>
              <div class="mt-6 space-y-3">
                ${tables.map(t => `
                  <div class="bg-rcNavyBase border border-rcNavyBorder rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div class="text-white font-bold">${escapeHtml(t.name)}</div>
                      <div class="text-rcSlateLight text-xs mt-1">${t('adminDash.seats')} ${(t.seats||[]).filter(s=>s&&s.userId).length}/${t.maxPlayers} • ${t('adminDash.waiting')} ${(t.waiting||[]).length}</div>
                    </div>
                    <button onclick="window.openTableAsAdmin('${t.id}')" class="bg-rcNavyPanel border border-rcGold/20 text-rcGold px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]">${t('common.open')}</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        ${modal}
        ${createModal}
      </div>
    `;
  };

  function kpi(title, value, color){
    return `
      <div class="bg-rcNavyPanel border border-rcNavyBorder rounded-2xl p-6 shadow-inner">
        <div class="text-[10px] text-rcSlate uppercase tracking-widest font-bold">${escapeHtml(title)}</div>
        <div class="${color} font-black font-mono text-3xl mt-3">${escapeHtml(value)}</div>
      </div>
    `;
  }

  function roleOptions(actorRole){
    const opts = ['all','player','admin','root'];
    // For admin, hide root option filter? keep.
    return opts;
  }

  function renderUserTable(users, actorRole){
    const store = getStore();

    const rows = users.map(u => {
      const statusColor = u.status === 'active' ? 'text-rcGreen' : (u.status === 'frozen' ? 'text-rcGold' : 'text-rcRed');
      const canManage = store.canManageTarget(actorRole, u.role);
      const btn = canManage ? `<button onclick="window.openManageUser('${u.id}')" class="bg-rcNavyPanel border border-rcGold/20 text-rcGold px-3 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]">Manage</button>` : `<span class="text-rcSlateLight text-xs">Locked</span>`;

      return `
        <tr class="border-b border-rcNavyBorder/70">
          <td class="py-3 pr-2">
            <div class="text-white font-bold">@${escapeHtml(u.username)}</div>
            <div class="text-rcSlateLight text-xs">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</div>
          </td>
          <td class="py-3 text-[10px] text-rcGold font-black uppercase tracking-widest">${escapeHtml(u.role)}</td>
          <td class="py-3 text-[10px] ${statusColor} font-black uppercase tracking-widest">${escapeHtml(u.status)}</td>
          <td class="py-3 text-[10px] text-white font-mono">${u.role === 'player' ? fmt(u.balanceCrown,2) : '–'}</td>
          <td class="py-3 pl-2 text-right">${btn}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-[9px] text-rcSlate uppercase tracking-widest">
              <th class="py-2">User</th>
              <th class="py-2">Role</th>
              <th class="py-2">Status</th>
              <th class="py-2">CROWN</th>
              <th class="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderCreateUserModal(stateObj){
    const store = getStore();
    const actorRole = role(stateObj);
    const canCreateStaff = actorRole === 'root';

    const roles = canCreateStaff ? ['player','admin'] : ['player'];

    return `
      <div class="fixed inset-0 bg-rcNavyBase/95 backdrop-blur-md z-[260] flex items-center justify-center p-4" onclick="window.closeCreateUser()">
        <div class="glass-panel p-7 md:p-10 rounded-3xl max-w-2xl w-full border border-rcGold/30" onclick="event.stopPropagation()">
          <div class="flex items-start justify-between gap-4 mb-6">
            <div>
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${t('adminDash.createUser')}</div>
              <div class="text-white font-black text-2xl mt-2">Account Provisioning</div>
              <div class="text-rcSlateLight text-sm mt-2">Root can create Admin. Admin can create Player.</div>
            </div>
            <button onclick="window.closeCreateUser()" class="text-rcSlate hover:text-white text-2xl">✕</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Role</label>
              <select id="cu_role" class="mt-2 w-full bg-rcNavyBase border border-rcNavyBorder text-white p-3 rounded-xl text-sm">
                ${roles.map(x => `<option value="${x}">${x.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Username</label>
              <input id="cu_username" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="Username">
            </div>
            <div>
              <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">First name</label>
              <input id="cu_first" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="First">
            </div>
            <div>
              <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Last name</label>
              <input id="cu_last" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="Last">
            </div>
            <div>
              <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Password</label>
              <input id="cu_pass" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="Password" value="changeme">
            </div>
            <div>
              <label class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Initial CROWN (players)</label>
              <input id="cu_bal" type="number" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="0" value="0">
            </div>
          </div>

          <div class="mt-8 flex gap-3">
            <button onclick="window.confirmCreateUser()" class="flex-1 poker-chip-btn py-3 rounded-2xl text-rcNavyBase font-black uppercase tracking-widest text-[10px]">Create</button>
            <button onclick="window.closeCreateUser()" class="flex-1 bg-rcNavyPanel border border-rcNavyBorder text-rcSlateLight hover:text-white py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancel</button>
          </div>
          <div id="cu_err" class="text-rcRed text-[10px] font-black uppercase tracking-widest mt-4"></div>
        </div>
      </div>
    `;
  }

  function renderManageUserModal(stateObj){
    const store = getStore();
    const actorRole = role(stateObj);
    const targetId = stateObj.ui.adminTargetUserId;
    const u = store.getUserById(targetId);
    if (!u) return '';

    const canManage = store.canManageTarget(actorRole, u.role);

    // Find if seated
    const tables = store.listTables();
    const seatedIn = findUserTable(tables, u.id);

    return `
      <div class="fixed inset-0 bg-rcNavyBase/95 backdrop-blur-md z-[260] flex items-center justify-center p-4" onclick="window.closeManageUser()">
        <div class="glass-panel p-7 md:p-10 rounded-3xl max-w-3xl w-full border border-rcGold/30" onclick="event.stopPropagation()">
          <div class="flex items-start justify-between gap-4 mb-6">
            <div>
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Manage User</div>
              <div class="text-white font-black text-2xl mt-2">@${escapeHtml(u.username)}</div>
              <div class="text-rcSlateLight text-sm mt-2">Role: ${escapeHtml(u.role)} • Status: ${escapeHtml(u.status)} • ID: ${escapeHtml(u.id)}</div>
              ${seatedIn ? `<div class="text-rcGold text-xs mt-2">Seated in: <span class="font-mono">${escapeHtml(seatedIn.table.name)} (seat ${seatedIn.seat+1})</span></div>` : ''}
            </div>
            <button onclick="window.closeManageUser()" class="text-rcSlate hover:text-white text-2xl">✕</button>
          </div>

          ${!canManage ? `<div class="bg-rcRed/10 border border-rcRed/30 p-4 rounded-2xl text-white text-sm">Permission denied for this target role.</div>` : ''}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div class="bg-black/20 border border-rcNavyBorder rounded-2xl p-5">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Identity</div>
              <div class="mt-4 space-y-3">
                ${field('Username', 'mu_username', u.username, !canManage)}
                ${field('First name', 'mu_first', u.firstName, !canManage)}
                ${field('Last name', 'mu_last', u.lastName, !canManage)}
                ${field('New password', 'mu_pass', '', !canManage, 'password')}

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Role</div>
                    <select id="mu_role" class="mt-2 w-full bg-rcNavyBase border border-rcNavyBorder text-white p-3 rounded-xl text-sm" ${!canManage ? 'disabled' : ''}>
                      ${roleSelectOptions(actorRole).map(rr => `<option value="${rr}" ${u.role===rr?'selected':''}>${rr.toUpperCase()}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Status</div>
                    <select id="mu_status" class="mt-2 w-full bg-rcNavyBase border border-rcNavyBorder text-white p-3 rounded-xl text-sm" ${!canManage ? 'disabled' : ''}>
                      ${['active','frozen','banned'].map(s => `<option value="${s}" ${u.status===s?'selected':''}>${s.toUpperCase()}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <button onclick="window.saveManagedUser('${u.id}')" class="w-full bg-rcNavyPanel border border-rcGold/20 text-rcGold hover:bg-rcGold hover:text-rcNavyBase py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all" ${!canManage ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>${t('adminDash.save')}</button>

                <button onclick="window.deleteManagedUser('${u.id}')" class="w-full bg-rcRed/10 border border-rcRed/30 text-rcRed hover:bg-rcRed hover:text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all" ${!canManage ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Delete user</button>
              </div>
              <div id="mu_err" class="text-rcRed text-[10px] font-black uppercase tracking-widest mt-4"></div>
            </div>

            <div class="bg-black/20 border border-rcNavyBorder rounded-2xl p-5">
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">Player Wallet</div>
              ${u.role === 'player' ? `
                <div class="text-rcSlateLight text-sm mt-2">Balance: <span class="text-rcGold font-mono font-black">${fmt(u.balanceCrown,2)} CROWN</span></div>

                <div class="grid grid-cols-3 gap-3 mt-4">
                  ${miniField('Amount', 'pw_amt', '10', !canManage)}
                  <div class="col-span-2">
                    <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">Reason</div>
                    <input id="pw_reason" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" placeholder="Reason" ${!canManage ? 'disabled' : ''}>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3 mt-4">
                  <button onclick="window.grantCrown('${u.id}')" class="bg-rcGreen text-rcNavyBase py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]" ${!canManage ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Grant</button>
                  <button onclick="window.burnCrown('${u.id}')" class="bg-rcGold text-rcNavyBase py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]" ${!canManage ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Burn</button>
                  <button onclick="window.drainCrown('${u.id}')" class="bg-rcRed text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]" ${!canManage ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Drain</button>
                </div>

                ${seatedIn ? `<button onclick="window.adminKickNow('${seatedIn.table.id}','${u.id}')" class="mt-4 w-full bg-rcRed/10 border border-rcRed/30 text-rcRed hover:bg-rcRed hover:text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Kick from table</button>` : ''}
              ` : `
                <div class="text-rcSlateLight text-sm mt-2">Wallet tools apply to players only.</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function field(label, id, value, disabled, type='text'){
    return `
      <div>
        <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${escapeHtml(label)}</div>
        <input id="${escapeHtml(id)}" type="${type}" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" value="${escapeHtml(value)}" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
      </div>
    `;
  }

  function miniField(label, id, value, disabled){
    return `
      <div>
        <div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold">${escapeHtml(label)}</div>
        <input id="${escapeHtml(id)}" class="mt-2 w-full poker-input p-3 rounded-xl text-sm" value="${escapeHtml(value)}" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
      </div>
    `;
  }

  function roleSelectOptions(actorRole){
    // Only PLAYER and ADMIN are assignable roles. ROOT is protected.
    return ['player','admin'];
  }

  function findUserTable(tables, userId){
    for (const t of tables){
      for (let i=0;i<(t.seats||[]).length;i++){
        const s=t.seats[i];
        if (s && s.userId===userId) return { table: t, seat: i };
      }
    }
    return null;
  }

  // -------------------- actions --------------------
  window.setAdminSearch = function(v){ window.APP_STATE.ui.adminSearch = v; };
  window.setAdminRoleFilter = function(v){ window.APP_STATE.ui.adminRoleFilter = v; if (typeof window.forceRerender==='function') window.forceRerender(); };

  window.openManageUser = function(userId){
    window.APP_STATE.ui.adminUserModalOpen = true;
    window.APP_STATE.ui.adminTargetUserId = userId;
    if (typeof window.forceRerender==='function') window.forceRerender();
  };
  window.closeManageUser = function(){
    window.APP_STATE.ui.adminUserModalOpen = false;
    window.APP_STATE.ui.adminTargetUserId = null;
    if (typeof window.forceRerender==='function') window.forceRerender();
  };

  window.openCreateUser = function(){
    window.APP_STATE.ui.adminCreateOpen = true;
    if (typeof window.forceRerender==='function') window.forceRerender();
  };
  window.closeCreateUser = function(){
    window.APP_STATE.ui.adminCreateOpen = false;
    if (typeof window.forceRerender==='function') window.forceRerender();
  };

  window.confirmCreateUser = function(){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    const err = document.getElementById('cu_err');
    if (err) err.textContent = '';

    const payload = {
      role: (document.getElementById('cu_role')||{}).value,
      username: (document.getElementById('cu_username')||{}).value,
      firstName: (document.getElementById('cu_first')||{}).value,
      lastName: (document.getElementById('cu_last')||{}).value,
      password: (document.getElementById('cu_pass')||{}).value,
      balanceCrown: Number((document.getElementById('cu_bal')||{}).value || 0)
    };

    try {
      store.createUser(actorRole, payload);
      window.closeCreateUser();
    } catch(e){
      if (err) err.textContent = String(e.message||e);
    }
  };

  window.saveManagedUser = function(userId){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    const err = document.getElementById('mu_err');
    if (err) err.textContent='';

    try {
      const username = (document.getElementById('mu_username')||{}).value;
      const firstName = (document.getElementById('mu_first')||{}).value;
      const lastName = (document.getElementById('mu_last')||{}).value;
      const pass = (document.getElementById('mu_pass')||{}).value;
      const newRole = (document.getElementById('mu_role')||{}).value;
      const status = (document.getElementById('mu_status')||{}).value;

      store.updateUserIdentity(actorRole, userId, { username, firstName, lastName });
      if (pass && String(pass).trim().length >= 4) store.resetPassword(actorRole, userId, String(pass).trim());
      store.setRole(actorRole, userId, newRole);
      store.setStatus(actorRole, userId, status);

      alert('Saved.');
      if (typeof window.forceRerender==='function') window.forceRerender();
    } catch(e){
      if (err) err.textContent = String(e.message||e);
    }
  };

  window.deleteManagedUser = function(userId){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    if (!confirm('Delete this user?')) return;
    try { store.deleteUser(actorRole, userId); window.closeManageUser(); }
    catch(e){ const err=document.getElementById('mu_err'); if(err) err.textContent=String(e.message||e); }
  };

  function walletAmount(){ return Number((document.getElementById('pw_amt')||{}).value || 0); }
  function walletReason(){ return (document.getElementById('pw_reason')||{}).value || ''; }

  window.grantCrown = function(userId){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try { store.grantPlayer(actorRole, userId, walletAmount(), walletReason()||'Grant'); alert('Granted.'); if(typeof window.forceRerender==='function') window.forceRerender(); }
    catch(e){ alert(String(e.message||e)); }
  };

  window.burnCrown = function(userId){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try { store.burnPlayer(actorRole, userId, walletAmount(), walletReason()||'Burn'); alert('Burned.'); if(typeof window.forceRerender==='function') window.forceRerender(); }
    catch(e){ alert(String(e.message||e)); }
  };

  window.drainCrown = function(userId){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try { store.drainPlayer(actorRole, userId, walletAmount(), walletReason()||'Drain'); alert('Drained.'); if(typeof window.forceRerender==='function') window.forceRerender(); }
    catch(e){ alert(String(e.message||e)); }
  };

  window.toggleWithdrawalsAdmin = function(){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    const cfg = store.loadConfig();
    try { store.setWithdrawalsActive(actorRole, !cfg.withdrawalsActive); if(typeof window.forceRerender==='function') window.forceRerender(); }
    catch(e){ alert(String(e.message||e)); }
  };

  window.openTableAsAdmin = function(tableId){
    window.APP_STATE.ui.activeTableId = tableId;
    window.APP_STATE.ui.spectatorMode = true;
    window.navigateTo('poker_table');
  };

  window.adminKickNow = function(tableId, userId){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try { store.kickPlayer(actorRole, tableId, userId, 'Admin enforcement'); alert('Kicked.'); window.closeManageUser(); }
    catch(e){ alert(String(e.message||e)); }
  };

  // -------------------- schedule controls --------------------
  window.toggleScheduleEnabledAdmin = function(){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try{
      const cfg = store.loadConfig();
      store.setScheduleEnabled(actorRole, !cfg.scheduleEnabled);
      if(typeof window.forceRerender==='function') window.forceRerender();
    }catch(e){
      alert(String(e.message || e));
    }
  };

  window.setTimezoneAdmin = function(tz){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try{
      store.setTimezone(actorRole, tz);
      if(typeof window.forceRerender==='function') window.forceRerender();
    }catch(e){
      alert(String(e.message || e));
    }
  };

  window.saveScheduleAdmin = function(){
    const store = getStore();
    const actorRole = role(window.APP_STATE || {});
    try{
      const patch = {};
      for(let day=0; day<=6; day++){
        const en = document.getElementById(`sch_en_${day}`);
        const op = document.getElementById(`sch_open_${day}`);
        const cl = document.getElementById(`sch_close_${day}`);
        patch[String(day)] = {
          enabled: !!(en && en.checked),
          open: (op && op.value) ? String(op.value) : '18:00',
          close: (cl && cl.value) ? String(cl.value) : '02:00',
        };
      }
      store.updateWeeklySchedule(actorRole, patch);

      // Max deposit per player
      const maxEl = document.getElementById('max_dep');
      const raw = maxEl ? Number(maxEl.value) : 0;
      store.updateFinanceConfig(actorRole, { maxDepositPerUserUSDT: Number.isFinite(raw) ? raw : 0 });

      alert('Schedule saved.');
      if(typeof window.forceRerender==='function') window.forceRerender();
    }catch(e){
      alert(String(e.message || e));
    }
  };

})();