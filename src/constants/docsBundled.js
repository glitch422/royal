/**
 * ==========================================
 * ROYAL - DOCUMENT BUNDLE (V3)
 * ==========================================
 * File:// compatible: bundled strings (no fetch).
 * Languages: HE / AR / EN / FR / RU.
 */

window.ROYAL_DOCS_BUNDLE = {
  en: {
    wallets: `# 01 - How to set up a crypto wallet and buy USDT

Effective date: 2026-02-24

This guide explains how to create a wallet, buy USDT, and send it safely. Educational only.

Supported USDT networks on ROYAL:
- TRC20 (Tron)
- ERC20 (Ethereum)

Critical rule: the network must match on both sides.

## Security basics
- Never share your seed phrase.
- Enable 2FA on exchanges.
- For a new address, start with a small test transfer.

## Typical flow
1. Create a wallet (self custody) or use an exchange wallet (custodial).
2. Buy USDT.
3. When sending, select the same network shown on the ROYAL checkout.
4. Keep the TXID in case support asks for it.
`,

    buy_crown: `# 02 - Buying CROWN with USDT

Effective date: 2026-02-24

CROWN is an internal credit. The default value model is:
- 1 CROWN = $1

Supported networks:
- TRC20
- ERC20

Checkout statuses (mock):
- waiting → confirming → finished

If a payment is confirmed on chain but your balance is not credited, contact support and provide the TXID.
`,

    privacy: `# 03 - Privacy Policy

Effective date: 2026-02-24

We collect account identity fields you provide (username, first name, last name), technical and security metadata (IP, device, logs), and payment metadata (network, address, TXID, statuses).

We do not collect seed phrases or private keys.

Contact: Support.
`,

    terms: `# 04 - Terms of Use

Effective date: 2026-02-24

## Account security
You are responsible for keeping your credentials secure.

## Withdraw visibility rules
The Withdraw UI is shown only if:
1. withdrawalsActive is enabled in system status
2. your wallet balance is at least 50 CROWN

If either condition fails, the Withdraw UI is hidden.

## Withdraw request minimum
Submitting a withdrawal request requires meeting the request minimum configured by the platform (default: 60 CROWN).

## Network responsibility
Crypto transfers are not reversible. You are responsible for choosing the correct network and address.
`,

    refunds: `# 05 - No Refund Policy

Effective date: 2026-02-24

All crypto payments are final. Verify address, network, and amount before sending.

If you sent funds but used the wrong network, recovery may be impossible.
`,

    convert: `# 06 - Converting CROWN to USDT (Withdrawal Request)

Effective date: 2026-02-24

This process is **not automatic**. It is a **request form**.
After you submit a request, it is reviewed for fairness and then paid manually.

## 1) When the Withdraw button appears
The Withdraw button is shown only if:
- withdrawalsActive = true (global system toggle)
- your wallet balance is at least **50 CROWN**

If withdrawalsActive is disabled, the button is hidden for everyone.

## 2) Minimum amount to request
The request minimum is a platform parameter.
Default configuration:
- Minimum request: **60 CROWN**

If you have 60 CROWN, you cannot request 80 CROWN.
Your request must be less than or equal to your **Available** balance.

## 3) What you must fill in
In the Withdraw form you must provide:
- Amount in CROWN
- Network: TRC20 or ERC20
- Your USDT wallet address for that network

## 4) Fees and fairness cap (max 5%)
Your payout is calculated from:
- Gross USDT = AmountCROWN × (CROWN/USD rate)
  - Default: 1 CROWN = $1
- Total fees = Network Fee + Service Fee
  - Network Fee covers the blockchain transfer cost
  - Service Fee is a small house fee
- The system caps the **total fee** so it never exceeds **5%** of the gross value

This is designed to be profitable for the house, yet fair for the player.

## 5) Review and approval flow
### Step A - Request submitted
Status becomes: **Requested**

### Step B - Fair Play verification (Admin Manager)
A Admin Manager reviews the player’s activity and recent hands:
- abnormal win patterns
- suspected collusion
- bug exploitation
- suspicious table behavior

### Step C - Payout execution (Admin)
If the Admin Manager approves, the Admin executes the USDT transfer and records:
- TXID
- network
- paid timestamp

Status becomes: **Paid**.

### If rejected
The request is rejected with a reason.
Depending on the case:
- CROWN may be returned to your wallet
- or temporarily frozen if fraud is suspected

## 6) Safety checklist
- Copy-paste your address, never type it manually
- Ensure the network matches your wallet
- Keep your TXID after payout

Support can help with UI issues, but cannot reverse a wrong-network transfer.
`,
  },

  fr: {
    wallets: `# 01 - Créer un portefeuille crypto et acheter des USDT

Date: 2026-02-24

Réseaux USDT pris en charge:
- TRC20
- ERC20

Règle critique: le réseau doit correspondre exactement.
`,

    buy_crown: `# 02 - Acheter des CROWN avec des USDT

Date: 2026-02-24

Modèle par défaut: 1 CROWN = 1 $.
Statuts: waiting → confirming → finished.
`,

    privacy: `# 03 - Politique de confidentialité

Date: 2026-02-24

Nous collectons des données de compte, des logs techniques (IP) et des métadonnées de paiement (réseau, TXID).
Nous ne collectons pas de seed phrase.
`,

    terms: `# 04 - Conditions d’utilisation

Date: 2026-02-24

Withdraw est affiché uniquement si:
- withdrawalsActive = true
- solde ≥ 50 CROWN

Minimum de demande (par défaut): 50 CROWN.
`,

    refunds: `# 05 - Politique de non-remboursement

Date: 2026-02-24

Les paiements crypto sont définitifs.
`,

    convert: `# 06 - Convertir des CROWN en USDT (demande de retrait)

Date: 2026-02-24

Ceci est une **demande**, pas un retrait automatique.

Visibilité du bouton Withdraw:
- withdrawalsActive = true
- solde ≥ 50 CROWN

Minimum de demande (par défaut): 50 CROWN.

Processus:
1) Demande envoyée
2) Revue par Admin
3) Paiement manuel par Admin (TXID)

Frais:
- frais réseau uniquement (aucuns frais plateforme)
`,
  },

  ar: {
    wallets: `<div dir="rtl">\n\n# 01 - إنشاء محفظة وشراء USDT\n\nتاريخ: 2026-02-24\n\nالشبكات المدعومة:\n- TRC20\n- ERC20\n\nقاعدة مهمة: يجب أن تتطابق الشبكة تماماً.\n\n</div>`,

    buy_crown: `<div dir="rtl">\n\n# 02 - شراء CROWN عبر USDT\n\nتاريخ: 2026-02-24\n\nالقيمة الافتراضية: 1 CROWN = 1$.\n\n</div>`,

    privacy: `<div dir="rtl">\n\n# 03 - سياسة الخصوصية\n\nتاريخ: 2026-02-24\n\nنجمع بيانات الحساب والسجلات التقنية وبيانات الدفع (TXID).\nلا نجمع عبارات الاسترداد.\n\n</div>`,

    terms: `<div dir="rtl">\n\n# 04 - شروط الاستخدام\n\nتاريخ: 2026-02-24\n\nزر السحب يظهر فقط إذا:\n- withdrawalsActive = true\n- الرصيد ≥ 50 CROWN\n\nالحد الأدنى للطلب (افتراضي): 50 CROWN\n\n</div>`,

    refunds: `<div dir="rtl">\n\n# 05 - سياسة عدم الاسترداد\n\nتاريخ: 2026-02-24\n\nجميع المدفوعات نهائية.\n\n</div>`,

    convert: `<div dir="rtl">\n\n# 06 - تحويل CROWN إلى USDT (طلب سحب)\n\nتاريخ: 2026-02-24\n\nهذا **طلب** وليس سحباً تلقائياً.\n\nزر السحب يظهر فقط إذا:\n- withdrawalsActive = true\n- الرصيد ≥ 50 CROWN\n\nالحد الأدنى للطلب (افتراضي): 50 CROWN\n\nالمراحل:\n1) طلب
2) مراجعة من Admin
3) تحويل يدوي من Admin مع TXID\n\nالرسوم:
- رسوم الشبكة فقط (بدون رسوم منصة)\n\n</div>`,
  },

  // --- Added for vNext: Hebrew + Russian bundles (placeholders, fallback to EN until translated) ---
  he: {
    wallets: window.ROYAL_DOCS_BUNDLE?.en?.wallets || `# 01 - מדריך ארנק USDT\n\n(תרגום יתווסף)`,
    payments: window.ROYAL_DOCS_BUNDLE?.en?.payments || `# 02 - תשלומים\n\n(תרגום יתווסף)`,
    privacy: window.ROYAL_DOCS_BUNDLE?.en?.privacy || `# 03 - מדיניות פרטיות\n\n(תרגום יתווסף)`,
    terms: window.ROYAL_DOCS_BUNDLE?.en?.terms || `# 04 - תנאי שימוש\n\n(תרגום יתווסף)`,
    noRefund: window.ROYAL_DOCS_BUNDLE?.en?.noRefund || `# 05 - מדיניות ללא החזר\n\n(תרגום יתווסף)`,
    convert: window.ROYAL_DOCS_BUNDLE?.en?.convert || `# 06 - המרה\n\n(תרגום יתווסף)`,
  },
  ru: {
    wallets: window.ROYAL_DOCS_BUNDLE?.en?.wallets || `# 01 - Кошелек USDT\n\n(перевод будет добавлен)`,
    payments: window.ROYAL_DOCS_BUNDLE?.en?.payments || `# 02 - Платежи\n\n(перевод будет добавлен)`,
    privacy: window.ROYAL_DOCS_BUNDLE?.en?.privacy || `# 03 - Политика конфиденциальности\n\n(перевод будет добавлен)`,
    terms: window.ROYAL_DOCS_BUNDLE?.en?.terms || `# 04 - Условия использования\n\n(перевод будет добавлен)`,
    noRefund: window.ROYAL_DOCS_BUNDLE?.en?.noRefund || `# 05 - Без возврата\n\n(перевод будет добавлен)`,
    convert: window.ROYAL_DOCS_BUNDLE?.en?.convert || `# 06 - Конвертация\n\n(перевод будет добавлен)`,
  },
};
