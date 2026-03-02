/**
 * ==========================================
 * ROYAL - DYNAMIC DOCUMENT RETRIEVAL MODULE
 * ==========================================
 * File:// compatible: documents are bundled into JS (no fetch required).
 * Includes Stealth Protocol: hides liquidation docs from unauthorized viewers.
 */

const DOC_MAP = {
  wallets: '01-wallets-and-usdt.md',
  buy_crown: '02-buy-crown-nowpayments.md',
  privacy: '03-privacy-policy.md',
  terms: '04-terms-of-use.md',
  refunds: '05-no-refund-policy.md',
  convert: '06-convert-crown-to-usdt.md',
};

const parseMarkdown = (mdText) => {
  let html = mdText
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-rcGold mt-6 mb-2 uppercase tracking-widest">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-black text-rcGold mt-8 mb-3 uppercase tracking-widest border-b border-rcNavyBorder pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-white mt-4 mb-6 uppercase tracking-widest drop-shadow-md">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/^\* (.*$)/gim, '<li class="text-rcSlateLight text-sm ml-4 mb-1 list-disc">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="text-rcSlateLight text-sm ml-4 mb-1 list-dash">$1</li>')
    .replace(/^\s*(\n)?(.+)/gim, function (m) {
      return /\<(\/)?(h1|h2|h3|ul|ol|li|blockquote|pre|img)/.test(m)
        ? m
        : '<p class="text-rcSlateLight text-sm leading-relaxed mb-4">' + m + '</p>';
    });
  return html.trim();
};

function getRoleFromState(stateObj) {
  return stateObj.role || stateObj.activeRole || 'guest';
}

window.loadDocument = async function (docKey, stateObj) {
  const modalContainer = document.getElementById('document_modal_content');
  if (!modalContainer) return;

  const role = getRoleFromState(stateObj);

  if (docKey === 'convert') {
    const isAuthorizedStaff = ['root', 'admin', 'admin', 'admin', 'support'].includes(role);
    const isQualifiedPlayer = role === 'player' && stateObj.user && Number(stateObj.user.balance || 0) >= (window.BusinessRules ? window.BusinessRules.WITHDRAW_BUTTON_MIN_CROWN : 50);

    if (!isAuthorizedStaff && !isQualifiedPlayer) {
      console.warn('Stealth Triggered: Unauthorized access attempt to liquidation protocol.');
      modalContainer.innerHTML = `
        <div class="bg-rcRed/10 border border-rcRed/30 p-6 rounded-xl text-center">
          <span class="text-3xl mb-3 block">⚠️</span>
          <h3 class="text-rcRed font-bold uppercase tracking-widest mb-2">${(window.t?window.t('docs.unavailable'):'Document Unavailable')}</h3>
          <p class="text-rcSlateLight text-xs">${(window.t?window.t('docs.unavailableBody'):'The requested document could not be found or you do not have the required clearance to view it.')}</p>
        </div>
      `;
      return;
    }
  }

  modalContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rcGold mb-4"></div>
      <p class="text-rcSlate text-xs uppercase tracking-widest font-mono">${(window.t?window.t('docs.retrieval'):'Retrieving Strategic Document...')}</p>
    </div>
  `;

  const bundle = window.ROYAL_DOCS_BUNDLE || {};
  const lang = stateObj.lang || 'en';
  const docText = bundle[lang] ? bundle[lang][docKey] : null;

  if (!docText) {
    const fileName = DOC_MAP[docKey] || 'UNKNOWN';
    modalContainer.innerHTML = `
      <div class="bg-rcRed/10 border border-rcRed/30 p-6 rounded-xl text-center">
        <span class="text-3xl mb-3 block">⚠️</span>
        <h3 class="text-rcRed font-bold uppercase tracking-widest mb-2">${(window.t?window.t('docs.failed'):'Retrieval Failed')}</h3>
        <p class="text-rcSlateLight text-xs">${(window.t?window.t('docs.missing'):'Bundled document missing for:')} <span class="text-white font-mono">${lang}/${fileName}</span></p>
      </div>
    `;
    return;
  }

  // If the bundled doc is already HTML (for RTL wrappers), render it as-is.
  const raw = String(docText || '').trim();
  if (raw.startsWith('<')) {
    modalContainer.innerHTML = raw;
  } else {
    modalContainer.innerHTML = parseMarkdown(raw);
  }
};

window.renderDocumentModal = function (stateObj) {
  if (!stateObj.ui.activeDoc) return '';

  const dir = (stateObj.lang === 'ar' || stateObj.lang === 'he') ? 'rtl' : 'ltr';

  const docKey = stateObj.ui.activeDoc;
  if(docKey === 'hub'){
    const t = window.t || ((k)=>k);
    const TRC20 = (window.wrapLTR?window.wrapLTR('TRC20'):'TRC20');
    const ERC20 = (window.wrapLTR?window.wrapLTR('ERC20'):'ERC20');
    const items = [
      {key:'wallets', label:t('docs.wallets')},
      {key:'buy_crown', label:t('docs.buyCrown')},
      {key:'convert', label:t('docs.convert')},
      {key:'terms', label:t('docs.terms')},
      {key:'privacy', label:t('docs.privacy')},
      {key:'refunds', label:t('docs.refunds')},
    ];
    const buttons = items.map(it=>`<button onclick="window.openDocumentModal('${it.key}')" class="w-full text-left bg-black/20 hover:bg-black/30 border border-rcNavyBorder/50 rounded-xl p-4">
      <div class="text-white font-black">${it.label}</div>
      <div class="text-rcSlateLight text-xs mt-1">${(window.t?window.t('common.open'):'Open')}</div>
    </button>`).join('');
    return `
      <div class="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="${dir}">
        <div class="w-full max-w-2xl bg-rcNavyPanel border border-rcNavyBorder rounded-3xl overflow-hidden shadow-2xl">
          <div class="p-6 border-b border-rcNavyBorder flex items-center justify-between">
            <div>
              <div class="text-rcGold text-[10px] font-black uppercase tracking-widest">${(window.t?window.t('docs.hubTitle'):'Documents')}</div>
              <div class="text-white font-black text-2xl mt-1">${(window.t?window.t('docs.hubHeadline'):'Information Center')}</div>
              <div class="text-rcSlateLight text-sm mt-1">${(window.t?window.t('docs.hubSub',{TRC20:(window.wrapLTR?window.wrapLTR('TRC20'):'TRC20'), ERC20:(window.wrapLTR?window.wrapLTR('ERC20'):'ERC20')}) : 'TRC20 and ERC20 only • Network fees apply')}</div>
            </div>
            <button onclick="window.closeDocumentModal()" class="text-rcSlateLight hover:text-white font-black text-xl">✕</button>
          </div>
          <div class="p-6 grid gap-3">
            ${buttons}
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="fixed inset-0 bg-rcNavyBase/95 backdrop-blur-md z-[200] flex items-center justify-center p-4 fade-in" onclick="closeDocumentModal()">
      <div class="glass-panel p-6 md:p-10 rounded-3xl max-w-4xl w-full border border-rcGold/30 flex flex-col max-h-[90vh]" onclick="event.stopPropagation()" dir="${dir}">

        <div class="flex justify-between items-center mb-6 border-b border-rcNavyBorder pb-4 shrink-0">
          <div class="flex items-center gap-3">
            <span class="text-rcGold text-2xl">🏛️</span>
            <h2 class="text-rcGold font-black uppercase tracking-widest">${(window.t?window.t('docs.protocol'):'Official Protocol')}</h2>
          </div>
          <button onclick="closeDocumentModal()" class="text-rcSlate hover:text-white text-2xl transition-colors">✕</button>
        </div>

        <div id="document_modal_content" class="overflow-y-auto custom-scrollbar pr-4 flex-grow doc-content"></div>

        <div class="mt-6 pt-4 border-t border-rcNavyBorder flex justify-end shrink-0">
          <button onclick="closeDocumentModal()" class="bg-transparent border border-rcNavyBorder text-rcSlateLight hover:text-white font-bold py-2 px-8 rounded-lg uppercase text-xs tracking-widest transition-colors hover:border-rcGold">
            ${(window.t?window.t('docs.acknowledgeClose'):'Acknowledge & Close')}
          </button>
        </div>
      </div>
    </div>
  `;
};

// --- MODAL CONTROL API ---
window.openDocumentModal = function(docKey) {
  window.APP_STATE.ui.activeDoc = docKey;
  if (typeof window.forceRerender === 'function') window.forceRerender();
};

window.closeDocumentModal = function() {
  window.APP_STATE.ui.activeDoc = null;
  if (typeof window.forceRerender === 'function') window.forceRerender();
};
