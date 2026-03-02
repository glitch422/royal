/**
 * ROYAL - FLOATING ACTIONS (stable)
 * - Quick Buy (Gateway modal trigger) must remain
 * - No Support role / no Support menu
 */
(function () {
  'use strict';

  window.FLOATING_STATE = window.FLOATING_STATE || { isChatOpen: false, isQuickBuyOpen: false };

  function isStaff(role) { return role === 'admin' || role === 'root'; }

  function getRole() {
    var s = window.APP_STATE || {};
    return s.role || s.activeRole || 'guest';
  }

  function qs(id) { return document.getElementById(id); }

  // ---------- QUICK BUY ----------
  window.openQuickBuy = function () {
    window.FLOATING_STATE.isQuickBuyOpen = true;
    // Prefer existing gateway modal if present
    if (typeof window.openGatewayCheckout === 'function') return window.openGatewayCheckout();
    if (typeof window.openCryptoCheckoutModal === 'function') return window.openCryptoCheckoutModal();
    // Fallback: click an existing button if the UI has it
    var btn = qs('quick_buy_btn') || qs('open_quick_buy');
    if (btn && typeof btn.click === 'function') btn.click();
  };

  // ---------- GOD VIEW SHORTCUT ----------
  window.openGodView = function () {
    var role = getRole();
    if (!isStaff(role)) return;
    if (typeof window.navigateTo === 'function') return window.navigateTo('react_admin_god_view');
    // fallback to opening standalone page if it exists
    var a = document.createElement('a');
    a.href = 'react_admin_panel_example/god_view.html';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  // ---------- RENDER FLOATING BUTTONS ----------
  function ensureContainer() {
    var c = qs('floating_actions_container');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'floating_actions_container';
    c.style.position = 'fixed';
    c.style.right = '18px';
    c.style.bottom = '18px';
    c.style.zIndex = '9999';
    c.style.display = 'flex';
    c.style.flexDirection = 'column';
    c.style.gap = '10px';
    document.body.appendChild(c);
    return c;
  }

  function mkBtn(label, onClick, id) {
    var b = document.createElement('button');
    if (id) b.id = id;
    b.type = 'button';
    b.textContent = label;
    b.style.padding = '12px 14px';
    b.style.borderRadius = '14px';
    b.style.border = '1px solid rgba(255,255,255,0.12)';
    b.style.background = 'rgba(12,18,34,0.95)';
    b.style.color = '#e7d9b0';
    b.style.fontWeight = '700';
    b.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    b.style.cursor = 'pointer';
    b.addEventListener('click', function (e) { e.preventDefault(); onClick(); });
    return b;
  }

  function render() {
    var c = ensureContainer();
    // clear
    while (c.firstChild) c.removeChild(c.firstChild);

    // Quick Buy always available for logged-in users (player/admin/root). For guest it can still show.
    var t = window.t || ((k)=>k);
    c.appendChild(mkBtn(t('floating.quickBuy'), window.openQuickBuy, 'fab_quick_buy'));

    // God View for staff only
    var role = getRole();
    if (isStaff(role)) { var t = window.t || ((k)=>k); c.appendChild(mkBtn(t('floating.godView'), window.openGodView, 'fab_god_view')); }
  }

  // Re-render when app state changes (simple polling to avoid tight coupling)
  function startRenderLoop() {
    var last = null;
    setInterval(function () {
      var role = getRole();
      if (role !== last) { last = role; render(); }
    }, 600);
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(); startRenderLoop(); });
  } else {
    render(); startRenderLoop();
  }
})();
