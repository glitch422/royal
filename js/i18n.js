/**
 * ==========================================
 * ROYAL - UI i18n + LOCALE HELPERS (V1.0)
 * ==========================================
 * Goals:
 * - Full UI translation for HE / AR / EN / FR / RU
 * - Correct RTL handling for HE/AR
 * - Safe LTR tokens (TXID, wallet addresses, TRC20/ERC20/USDT)
 * - Locale-aware number/date formatting
 */

(function () {
  'use strict';

  // ---- locale helpers ----
  const LOCALES = {
    en: 'en-US-u-nu-latn',
    he: 'he-IL-u-nu-latn',
    fr: 'fr-FR-u-nu-latn',
    ru: 'ru-RU-u-nu-latn',
    // Arabic: force Arabic-Indic digits
    ar: 'ar-EG-u-nu-arab',
  };

  function getLang() {
    const s = window.APP_STATE || {};
    return String(s.lang || 'en').toLowerCase();
  }

  function getLocale(lang) {
    const l = String(lang || getLang() || 'en').toLowerCase();
    return LOCALES[l] || LOCALES.en;
  }

  function isRTL(lang) {
    const l = String(lang || getLang() || 'en').toLowerCase();
    return l === 'he' || l === 'ar';
  }

  // ---- token wrappers ----
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function wrapLTR(value, extraClass = '') {
    const safe = escapeHtml(value);
    return `<span dir="ltr" class="ltr-token ${extraClass}">${safe}</span>`;
  }

  // ---- formatting ----
  function formatNumber(value, opts = {}) {
    const lang = getLang();
    const locale = getLocale(lang);
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;

    const o = Object.assign({
      maximumFractionDigits: 0,
    }, opts || {});

    try {
      return new Intl.NumberFormat(locale, o).format(safe);
    } catch (e) {
      // Fallback
      return String(Math.round(safe));
    }
  }

  function formatMoney(value, currency = 'USD', opts = {}) {
    const lang = getLang();
    const locale = getLocale(lang);
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;

    try {
      return new Intl.NumberFormat(locale, Object.assign({
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }, opts || {})).format(safe);
    } catch (e) {
      return formatNumber(safe, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  function formatDateTime(dateLike, opts = {}) {
    const lang = getLang();
    const locale = getLocale(lang);
    const d = (dateLike instanceof Date) ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';

    try {
      return new Intl.DateTimeFormat(locale, Object.assign({
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }, opts || {})).format(d);
    } catch (e) {
      return d.toISOString();
    }
  }

  // ---- translations ----
  // NOTE: Keep strings short where possible. Long paragraphs can remain EN and be upgraded later.
  const STRINGS = {
    en: {
      langName: { en: 'English', he: 'Hebrew', ar: 'Arabic', fr: 'French', ru: 'Russian' },

      common: {
        close: 'Close',
        back: 'Back',
        continue: 'Continue',
        cancel: 'Cancel',
        save: 'Save',
        saved: 'Saved.',
        logout: 'Logout',
        open: 'Open',
        yes: 'Yes',
        no: 'No',
      },

      shell: {
        premiumPlatform: 'Premium Members Platform',
        live: 'Live',
        status: 'Status',
        open: 'Open',
        closed: 'Closed',
        latency: 'Latency',
        terminate: 'Terminate Link',
        systemStatus: 'System Status',
        operational: 'Operational',
        documents: 'Documents',
        infoCenter: 'Information Center',
      },

      nav: {
        lobby: 'Strategic Lobby',
        dashboard: 'Command Dashboard',
        godView: 'God View',
        table: 'Table',
        takeSeat: 'Take a Seat',
      },

      auth: {
        portalTitle: 'Strategic Access Portal',
        operativeId: 'Operative ID',
        usernamePh: 'Username...',
        secureClearance: 'Secure Clearance',
        authEnter: 'Authenticate & Enter',
        or: 'Or',
        guestEnter: 'Enter as Guest (Observer)',
        newIdentity: 'Establish New Identity',

        identityCreation: 'Identity Creation',
        firstName: 'First Name',
        lastName: 'Last Name',
        privacyProtocolTitle: 'Privacy Protocol:',
        privacyProtocolBody: 'Personal identity data is strictly for internal compliance and visibility is restricted to ADMIN ROOT level only.',
        aliasVisible: 'Alias (Visible Username)',
        password: 'Password',
        finalize: 'Finalize Identity',
        returnLogin: 'Return to Login',

        errEnterUserPass: 'Please enter username and password.',
        errAliasRequired: 'Identity Alias required.',
        errPasswordRequired: 'Password required.',
        errStoreNotReady: 'Store is not ready. Refresh the page.',
      },

      access: {
        restrictedTitle: 'Access Restricted',
        restrictedBody: 'Observer status detected. Private portfolios and secure gateways are locked. Please establish a verified identity to proceed with CROWN operations.',
        registerIdentity: 'Register Identity',
      },

      lobby: {
        title: 'Strategic Lobby',
        subtitle: 'Choose a table. Players must take a seat to enter the table.',
        initialSupply: 'Initial Supply',
        observeLobby: 'Observe Lobby',
        enterStaff: 'Enter as Staff',
        joinQueue: 'Join Queue Lounge',
        sitNow: 'SIT NOW',
        tableId: 'Table ID',
        blinds: 'Blinds',
        profile: 'Profile',
        observationMode: 'Observation Mode',
        guestsObserve: 'Guests can observe tables. To sit and play, register a verified identity.',
        register: 'Register',
      },

      waiting: {
        title: 'Waiting Lounge',
        unavailableTitle: 'Waiting lounge unavailable',
        noTable: 'No table selected.',
        backToLobby: 'Back to Lobby',
        scanning: 'Scanning',
        staffAccess: 'Staff access',
        staffAccessBody: 'You are viewing the waiting lounge as staff. You are not counted as a player.',
        revokeExit: 'Revoke Queue & Exit',
        observeTable: 'Observe Table',
        seatsFillAuto: 'Seats fill automatically when capacity is available.',
        capacityThreshold: 'Capacity Threshold',
        queueIntel: 'Queue Intel',
        yourPosition: 'Your Position',
        seatAutoInfo: 'If the table opens a seat, the first in queue is seated automatically.',
      },

      checkout: {
        lockedTitle: 'Checkout locked',
        lockedBody: 'Guests can observe. Register to create a wallet and purchase CROWN.',
        buyCrown: 'Buy CROWN',
        cryptoCheckout: 'Crypto Checkout',
        standardOnly: 'Standard purchase only. No promos or referral bonuses.',
        valueModel: 'Value Model',
        amountUSDT: 'Amount (USDT)',
        network: 'Network',
        networksWarning: 'USDT networks supported: {{TRC20}} and {{ERC20}} only. You must deposit and withdraw on the same network. Sending USDT on the wrong network may result in loss of funds.',
        calculation: 'Calculation',
        youReceive: 'You will receive',
        breakdown: 'USDT breakdown',
        gross: 'Gross',
        networkFee: 'Network fee',
        netCredited: 'Net credited',
        notes: 'Notes',
        notesBody: 'No entry fees, no rake, no promos. The only fees are network fee only.',
        addressShown: 'Network address shown in the invoice panel.',
        createInvoice: 'Create Invoice',
        pendingJoin: 'Pending table join after payment:',

        status_waiting: 'Waiting',
        status_confirming: 'Confirming',
        status_finished: 'Confirmed',

        invoice: 'Invoice',
        noInvoice: 'No active invoice',
        createInvoiceTip: 'Create an invoice to view deposit status and confirmations.',
        tip: 'Tip',
        trcCheaper: '{{TRC20}} usually has the lowest network cost.',
        statusLabel: 'Status',
        sendExactly: 'Send exactly',
        address: 'Address',
        confirmations: 'Confirmations',
        simulateTick: 'Simulate Confirmation Tick',
        credited: 'Credited',
        addedToWallet: '{{amount}} CROWN added to wallet.',
        txid: 'TXID',
      },

      docs: {
        hubTitle: 'Documents',
        hubHeadline: 'Information Center',
        hubSub: '{{TRC20}} and {{ERC20}} only • Network fees apply',
        wallets: 'Wallets & Networks',
        buyCrown: 'How to Buy CROWN',
        convert: 'Convert CROWN to USDT',
        terms: 'Terms of Use',
        privacy: 'Privacy Policy',
        refunds: 'No-Refund Policy',
        retrieval: 'Retrieving Strategic Document...',
        unavailable: 'Document Unavailable',
        unavailableBody: 'The requested document could not be found or you do not have the required clearance to view it.',
        failed: 'Retrieval Failed',
        missing: 'Bundled document missing for:',
        protocol: 'Official Protocol',
        acknowledgeClose: 'Acknowledge & Close',
      },

      floating: {
        quickBuy: 'Quick Buy CROWN',
        godView: 'GOD VIEW',
      },

      profile: {
        title: 'Profile',
        settings: 'Profile settings',
        username: 'Username',
        firstName: 'First name',
        lastName: 'Last name',
        password: 'Password',
        avatar: 'Avatar',
        logoutInfo: 'Logout is always available.',
      },
    },

    he: {
      langName: { en: 'אנגלית', he: 'עברית', ar: 'ערבית', fr: 'צרפתית', ru: 'רוסית' },

      common: {
        close: 'סגור',
        back: 'חזרה',
        continue: 'המשך',
        cancel: 'ביטול',
        save: 'שמור',
        saved: 'נשמר.',
        logout: 'התנתק',
        open: 'פתח',
        yes: 'כן',
        no: 'לא',
      },

      shell: {
        premiumPlatform: 'פלטפורמת חברים פרימיום',
        live: 'חי',
        status: 'סטטוס',
        open: 'פתוח',
        closed: 'סגור',
        latency: 'שהיה',
        terminate: 'ניתוק',
        systemStatus: 'מצב מערכת',
        operational: 'פעיל',
        documents: 'מסמכים',
        infoCenter: 'מרכז מידע',
      },

      nav: {
        lobby: 'לובי אסטרטגי',
        dashboard: 'דשבורד פיקוד',
        godView: 'God View',
        table: 'שולחן',
        takeSeat: 'תפוס מקום',
      },

      auth: {
        portalTitle: 'פורטל גישה אסטרטגי',
        operativeId: 'מזהה משתמש',
        usernamePh: 'שם משתמש…',
        secureClearance: 'סיסמה',
        authEnter: 'התחבר והיכנס',
        or: 'או',
        guestEnter: 'היכנס כאורח (צופה)',
        newIdentity: 'יצירת זהות חדשה',

        identityCreation: 'יצירת זהות',
        firstName: 'שם פרטי',
        lastName: 'שם משפחה',
        privacyProtocolTitle: 'פרוטוקול פרטיות:',
        privacyProtocolBody: 'פרטי זהות נשמרים לצרכי ציות פנימי בלבד ונראים רק לדרגת ADMIN ROOT.',
        aliasVisible: 'כינוי (שם משתמש גלוי)',
        password: 'סיסמה',
        finalize: 'סיים הרשמה',
        returnLogin: 'חזרה להתחברות',

        errEnterUserPass: 'נא להזין שם משתמש וסיסמה.',
        errAliasRequired: 'חובה להזין כינוי.',
        errPasswordRequired: 'חובה להזין סיסמה.',
        errStoreNotReady: 'המערכת לא מוכנה. רענן את העמוד.',
      },

      access: {
        restrictedTitle: 'גישה מוגבלת',
        restrictedBody: 'זוהה מצב צפייה. תכונות פרטיות ושערים מאובטחים נעולים. כדי לבצע פעולות CROWN יש ליצור זהות מאומתת.',
        registerIdentity: 'הרשמה',
      },

      lobby: {
        title: 'לובי אסטרטגי',
        subtitle: 'בחר שולחן. שחקנים חייבים לשבת כדי להיכנס לשולחן.',
        initialSupply: 'היצע התחלתי',
        observeLobby: 'צפה בלובי',
        enterStaff: 'כניסה כצוות',
        joinQueue: 'הצטרף לחדר המתנה',
        sitNow: 'שב עכשיו',
        tableId: 'מזהה שולחן',
        blinds: 'בליינדס',
        profile: 'פרופיל',
        observationMode: 'מצב צפייה',
        guestsObserve: 'אורחים יכולים לצפות. כדי לשבת ולשחק יש להירשם.',
        register: 'הרשמה',
      },

      waiting: {
        title: 'חדר המתנה',
        unavailableTitle: 'חדר ההמתנה לא זמין',
        noTable: 'לא נבחר שולחן.',
        backToLobby: 'חזרה ללובי',
        scanning: 'סורק',
        staffAccess: 'גישה לצוות',
        staffAccessBody: 'אתה צופה בחדר ההמתנה כצוות. אינך נספר כשחקן.',
        revokeExit: 'צא מהתור',
        observeTable: 'צפה בשולחן',
        seatsFillAuto: 'המושבים מתמלאים אוטומטית כשמתפנה מקום.',
        capacityThreshold: 'סף קיבולת',
        queueIntel: 'מידע תור',
        yourPosition: 'המיקום שלך',
        seatAutoInfo: 'כאשר מתפנה מושב, הראשון בתור יושב אוטומטית.',
      },

      checkout: {
        lockedTitle: 'הצ׳קאאוט נעול',
        lockedBody: 'אורחים יכולים לצפות. הירשם כדי ליצור ארנק ולרכוש CROWN.',
        buyCrown: 'רכישת CROWN',
        cryptoCheckout: 'תשלום קריפטו',
        standardOnly: 'רכישה סטנדרטית בלבד. ללא מבצעים או הפניות.',
        valueModel: 'מודל ערך',
        amountUSDT: 'סכום (USDT)',
        network: 'רשת',
        networksWarning: 'רשתות USDT נתמכות: {{TRC20}} ו־{{ERC20}} בלבד. חובה להפקיד ולמשוך באותה רשת. שליחה ברשת לא נכונה עלולה לגרום לאובדן כספים.',
        calculation: 'חישוב',
        youReceive: 'תקבל',
        breakdown: 'פירוט USDT',
        gross: 'ברוטו',
        networkFee: 'עמלת רשת',
        netCredited: 'נטו לזיכוי',
        notes: 'הערות',
        notesBody: 'אין דמי כניסה ואין עמלות פלטפורמה. העמלה היחידה היא עמלת רשת בלבד.',
        addressShown: 'כתובת הרשת מוצגת בפאנל החשבונית.',
        createInvoice: 'צור חשבונית',
        pendingJoin: 'כניסה לשולחן אחרי תשלום:',

        status_waiting: 'ממתין',
        status_confirming: 'מאשר',
        status_finished: 'אושר',

        invoice: 'חשבונית',
        noInvoice: 'אין חשבונית פעילה',
        createInvoiceTip: 'צור חשבונית כדי לראות סטטוס והתקדמות אישורים.',
        tip: 'טיפ',
        trcCheaper: '{{TRC20}} בדרך כלל הכי זולה.',
        statusLabel: 'סטטוס',
        sendExactly: 'שלח בדיוק',
        address: 'כתובת',
        confirmations: 'אישורים',
        simulateTick: 'סימולציית אישור',
        credited: 'זוכה',
        addedToWallet: '{{amount}} CROWN נוספו לארנק.',
        txid: 'TXID',
      },

      docs: {
        hubTitle: 'מסמכים',
        hubHeadline: 'מרכז מידע',
        hubSub: '{{TRC20}} ו־{{ERC20}} בלבד • עמלת רשת חלה',
        wallets: 'ארנקים ורשתות',
        buyCrown: 'איך קונים CROWN',
        convert: 'המרת CROWN ל־USDT',
        terms: 'תנאי שימוש',
        privacy: 'מדיניות פרטיות',
        refunds: 'מדיניות ללא החזר',
        retrieval: 'טוען מסמך…',
        unavailable: 'מסמך לא זמין',
        unavailableBody: 'המסמך לא נמצא או שאין לך הרשאה לצפות בו.',
        failed: 'טעינת מסמך נכשלה',
        missing: 'מסמך חסר בבאנדל:',
        protocol: 'פרוטוקול רשמי',
        acknowledgeClose: 'אישור וסגירה',
      },

      floating: {
        quickBuy: 'רכישה מהירה',
        godView: 'GOD VIEW',
      },

      profile: {
        title: 'פרופיל',
        settings: 'הגדרות פרופיל',
        username: 'שם משתמש',
        firstName: 'שם פרטי',
        lastName: 'שם משפחה',
        password: 'סיסמה',
        avatar: 'אווטאר',
        logoutInfo: 'התנתקות תמיד זמינה.',
      },
    },

    ar: {
      langName: { en: 'الإنجليزية', he: 'العبرية', ar: 'العربية', fr: 'الفرنسية', ru: 'الروسية' },

      common: {
        close: 'إغلاق',
        back: 'رجوع',
        continue: 'متابعة',
        cancel: 'إلغاء',
        save: 'حفظ',
        saved: 'تم الحفظ.',
        logout: 'تسجيل الخروج',
        open: 'فتح',
        yes: 'نعم',
        no: 'لا',
      },

      shell: {
        premiumPlatform: 'منصة الأعضاء المميزين',
        live: 'مباشر',
        status: 'الحالة',
        open: 'مفتوح',
        closed: 'مغلق',
        latency: 'الكمون',
        terminate: 'إنهاء الرابط',
        systemStatus: 'حالة النظام',
        operational: 'يعمل',
        documents: 'المستندات',
        infoCenter: 'مركز المعلومات',
      },

      nav: {
        lobby: 'الردهة الاستراتيجية',
        dashboard: 'لوحة التحكم',
        godView: 'God View',
        table: 'الطاولة',
        takeSeat: 'خذ مقعدًا',
      },

      auth: {
        portalTitle: 'بوابة الوصول الاستراتيجية',
        operativeId: 'معرّف المستخدم',
        usernamePh: 'اسم المستخدم…',
        secureClearance: 'كلمة المرور',
        authEnter: 'تسجيل الدخول والدخول',
        or: 'أو',
        guestEnter: 'الدخول كضيف (مراقب)',
        newIdentity: 'إنشاء هوية جديدة',

        identityCreation: 'إنشاء الهوية',
        firstName: 'الاسم الأول',
        lastName: 'اسم العائلة',
        privacyProtocolTitle: 'بروتوكول الخصوصية:',
        privacyProtocolBody: 'بيانات الهوية للاستخدام الداخلي فقط ويقتصر عرضها على مستوى ADMIN ROOT.',
        aliasVisible: 'اسم مستعار (ظاهر)',
        password: 'كلمة المرور',
        finalize: 'إتمام التسجيل',
        returnLogin: 'العودة لتسجيل الدخول',

        errEnterUserPass: 'يرجى إدخال اسم المستخدم وكلمة المرور.',
        errAliasRequired: 'الاسم المستعار مطلوب.',
        errPasswordRequired: 'كلمة المرور مطلوبة.',
        errStoreNotReady: 'المخزن غير جاهز. حدّث الصفحة.',
      },

      access: {
        restrictedTitle: 'وصول مقيّد',
        restrictedBody: 'تم اكتشاف وضع المراقبة. الميزات الخاصة والبوابات الآمنة مقفلة. لإنجاز عمليات CROWN يجب إنشاء هوية مُحقّقة.',
        registerIdentity: 'تسجيل',
      },

      lobby: {
        title: 'الردهة الاستراتيجية',
        subtitle: 'اختر طاولة. يجب على اللاعبين أخذ مقعد للدخول.',
        initialSupply: 'المعروض الأولي',
        observeLobby: 'مراقبة الردهة',
        enterStaff: 'دخول كطاقم',
        joinQueue: 'الانضمام لغرفة الانتظار',
        sitNow: 'اجلس الآن',
        tableId: 'معرّف الطاولة',
        blinds: 'البلاندز',
        profile: 'الملف',
        observationMode: 'وضع المراقبة',
        guestsObserve: 'يمكن للضيوف المراقبة. للجلوس واللعب يرجى التسجيل.',
        register: 'تسجيل',
      },

      waiting: {
        title: 'غرفة الانتظار',
        unavailableTitle: 'غرفة الانتظار غير متاحة',
        noTable: 'لم يتم اختيار طاولة.',
        backToLobby: 'العودة إلى الردهة',
        scanning: 'جارٍ الفحص',
        staffAccess: 'وصول الطاقم',
        staffAccessBody: 'أنت تعرض غرفة الانتظار كطاقم. لا يتم احتسابك كلاعب.',
        revokeExit: 'إلغاء الانتظار والخروج',
        observeTable: 'مراقبة الطاولة',
        seatsFillAuto: 'يتم ملء المقاعد تلقائيًا عند توفر السعة.',
        capacityThreshold: 'عتبة السعة',
        queueIntel: 'معلومات الطابور',
        yourPosition: 'موقعك',
        seatAutoInfo: 'عند توفر مقعد، يتم إدخال أول شخص في الطابور تلقائيًا.',
      },

      checkout: {
        lockedTitle: 'الدفع مقفل',
        lockedBody: 'يمكن للضيوف المراقبة. سجّل لإنشاء محفظة وشراء CROWN.',
        buyCrown: 'شراء CROWN',
        cryptoCheckout: 'الدفع بالعملات الرقمية',
        standardOnly: 'شراء قياسي فقط. بلا عروض أو إحالات.',
        valueModel: 'نموذج القيمة',
        amountUSDT: 'المبلغ (USDT)',
        network: 'الشبكة',
        networksWarning: 'شبكات USDT المدعومة: {{TRC20}} و {{ERC20}} فقط. يجب الإيداع والسحب على نفس الشبكة. الإرسال على شبكة خاطئة قد يؤدي لفقدان الأموال.',
        calculation: 'الحساب',
        youReceive: 'ستستلم',
        breakdown: 'تفاصيل USDT',
        gross: 'الإجمالي',
        networkFee: 'رسوم الشبكة',
        netCredited: 'الصافي المضاف',
        notes: 'ملاحظات',
        notesBody: 'لا توجد رسوم دخول ولا رسوم منصة. الرسوم الوحيدة هي رسوم الشبكة فقط.',
        addressShown: 'عنوان الشبكة يظهر في لوحة الفاتورة.',
        createInvoice: 'إنشاء فاتورة',
        pendingJoin: 'الانضمام للطاولة بعد الدفع:',

        status_waiting: 'بانتظار',
        status_confirming: 'قيد التأكيد',
        status_finished: 'تم التأكيد',

        invoice: 'الفاتورة',
        noInvoice: 'لا توجد فاتورة نشطة',
        createInvoiceTip: 'أنشئ فاتورة لعرض حالة الإيداع وتأكيداته.',
        tip: 'نصيحة',
        trcCheaper: '{{TRC20}} عادةً الأقل تكلفة.',
        statusLabel: 'الحالة',
        sendExactly: 'أرسل بالضبط',
        address: 'العنوان',
        confirmations: 'التأكيدات',
        simulateTick: 'محاكاة تأكيد',
        credited: 'تمت الإضافة',
        addedToWallet: 'تمت إضافة {{amount}} CROWN إلى المحفظة.',
        txid: 'TXID',
      },

      docs: {
        hubTitle: 'المستندات',
        hubHeadline: 'مركز المعلومات',
        hubSub: '{{TRC20}} و {{ERC20}} فقط • تُطبق رسوم الشبكة',
        wallets: 'المحافظ والشبكات',
        buyCrown: 'كيفية شراء CROWN',
        convert: 'تحويل CROWN إلى USDT',
        terms: 'شروط الاستخدام',
        privacy: 'سياسة الخصوصية',
        refunds: 'سياسة عدم الاسترداد',
        retrieval: 'جارٍ تحميل المستند…',
        unavailable: 'المستند غير متاح',
        unavailableBody: 'المستند غير موجود أو لا تملك صلاحية العرض.',
        failed: 'فشل التحميل',
        missing: 'المستند مفقود في الحزمة:',
        protocol: 'البروتوكول الرسمي',
        acknowledgeClose: 'إقرار وإغلاق',
      },

      floating: {
        quickBuy: 'شراء سريع',
        godView: 'GOD VIEW',
      },

      profile: {
        title: 'الملف الشخصي',
        settings: 'إعدادات الملف',
        username: 'اسم المستخدم',
        firstName: 'الاسم الأول',
        lastName: 'اسم العائلة',
        password: 'كلمة المرور',
        avatar: 'الصورة',
        logoutInfo: 'تسجيل الخروج متاح دائمًا.',
      },
    },

    fr: {
      langName: { en: 'Anglais', he: 'Hébreu', ar: 'Arabe', fr: 'Français', ru: 'Russe' },

      common: {
        close: 'Fermer',
        back: 'Retour',
        continue: 'Continuer',
        cancel: 'Annuler',
        save: 'Enregistrer',
        saved: 'Enregistré.',
        logout: 'Déconnexion',
        open: 'Ouvrir',
        yes: 'Oui',
        no: 'Non',
      },

      shell: {
        premiumPlatform: 'Plateforme membres premium',
        live: 'Live',
        status: 'Statut',
        open: 'Ouvert',
        closed: 'Fermé',
        latency: 'Latence',
        terminate: 'Terminer le lien',
        systemStatus: 'État du système',
        operational: 'Opérationnel',
        documents: 'Documents',
        infoCenter: 'Centre d’information',
      },

      nav: {
        lobby: 'Lobby stratégique',
        dashboard: 'Tableau de commande',
        godView: 'God View',
        table: 'Table',
        takeSeat: 'Prendre une place',
      },

      auth: {
        portalTitle: 'Portail d’accès stratégique',
        operativeId: 'Identifiant',
        usernamePh: 'Nom d’utilisateur…',
        secureClearance: 'Mot de passe',
        authEnter: 'S’authentifier et entrer',
        or: 'Ou',
        guestEnter: 'Entrer en invité (observateur)',
        newIdentity: 'Créer une nouvelle identité',

        identityCreation: 'Création d’identité',
        firstName: 'Prénom',
        lastName: 'Nom',
        privacyProtocolTitle: 'Protocole de confidentialité :',
        privacyProtocolBody: 'Les données d’identité sont uniquement pour la conformité interne et visibles au niveau ADMIN ROOT.',
        aliasVisible: 'Alias (nom visible)',
        password: 'Mot de passe',
        finalize: 'Finaliser',
        returnLogin: 'Retour à la connexion',

        errEnterUserPass: 'Veuillez saisir le nom d’utilisateur et le mot de passe.',
        errAliasRequired: 'Alias requis.',
        errPasswordRequired: 'Mot de passe requis.',
        errStoreNotReady: 'Le store n’est pas prêt. Actualisez la page.',
      },

      access: {
        restrictedTitle: 'Accès restreint',
        restrictedBody: 'Mode observateur détecté. Les zones privées et passerelles sécurisées sont verrouillées. Créez une identité vérifiée pour les opérations CROWN.',
        registerIdentity: 'S’inscrire',
      },

      lobby: {
        title: 'Lobby stratégique',
        subtitle: 'Choisissez une table. Les joueurs doivent prendre une place pour entrer.',
        initialSupply: 'Offre initiale',
        observeLobby: 'Observer le lobby',
        enterStaff: 'Entrer (staff)',
        joinQueue: 'Salle d’attente',
        sitNow: 'S’ASSEOIR',
        tableId: 'ID de table',
        blinds: 'Blinds',
        profile: 'Profil',
        observationMode: 'Mode observation',
        guestsObserve: 'Les invités peuvent observer. Pour jouer, inscrivez-vous.',
        register: 'S’inscrire',
      },

      waiting: {
        title: 'Salle d’attente',
        unavailableTitle: 'Salle d’attente indisponible',
        noTable: 'Aucune table sélectionnée.',
        backToLobby: 'Retour au lobby',
        scanning: 'Analyse',
        staffAccess: 'Accès staff',
        staffAccessBody: 'Vous consultez la salle d’attente en tant que staff. Vous n’êtes pas compté comme joueur.',
        revokeExit: 'Quitter la file',
        observeTable: 'Observer la table',
        seatsFillAuto: 'Les places se remplissent automatiquement quand une place est disponible.',
        capacityThreshold: 'Seuil de capacité',
        queueIntel: 'Infos file',
        yourPosition: 'Votre position',
        seatAutoInfo: 'Si une place se libère, le premier de la file est assis automatiquement.',
      },

      checkout: {
        lockedTitle: 'Paiement verrouillé',
        lockedBody: 'Les invités peuvent observer. Inscrivez-vous pour acheter CROWN.',
        buyCrown: 'Acheter CROWN',
        cryptoCheckout: 'Paiement crypto',
        standardOnly: 'Achat standard uniquement. Pas de promos.',
        valueModel: 'Modèle de valeur',
        amountUSDT: 'Montant (USDT)',
        network: 'Réseau',
        networksWarning: 'Réseaux USDT pris en charge : {{TRC20}} et {{ERC20}} uniquement. Dépôt et retrait sur le même réseau. Envoi sur un mauvais réseau = risque de perte.',
        calculation: 'Calcul',
        youReceive: 'Vous recevrez',
        breakdown: 'Détail USDT',
        gross: 'Brut',
        networkFee: 'Frais réseau',
        netCredited: 'Net crédité',
        notes: 'Notes',
        notesBody: 'Aucun frais d’entrée et aucune commission plateforme. Frais réseau uniquement.',
        addressShown: 'Adresse réseau dans le panneau de facture.',
        createInvoice: 'Créer une facture',
        pendingJoin: 'Rejoindre la table après paiement :',

        status_waiting: 'En attente',
        status_confirming: 'Confirmation',
        status_finished: 'Confirmé',

        invoice: 'Facture',
        noInvoice: 'Aucune facture active',
        createInvoiceTip: 'Créez une facture pour voir le statut et les confirmations.',
        tip: 'Astuce',
        trcCheaper: '{{TRC20}} est souvent le moins cher.',
        statusLabel: 'Statut',
        sendExactly: 'Envoyez exactement',
        address: 'Adresse',
        confirmations: 'Confirmations',
        simulateTick: 'Simuler une confirmation',
        credited: 'Crédité',
        addedToWallet: '{{amount}} CROWN ajoutés au portefeuille.',
        txid: 'TXID',
      },

      docs: {
        hubTitle: 'Documents',
        hubHeadline: 'Centre d’information',
        hubSub: '{{TRC20}} et {{ERC20}} uniquement • Frais réseau',
        wallets: 'Portefeuilles & réseaux',
        buyCrown: 'Acheter CROWN',
        convert: 'Convertir CROWN en USDT',
        terms: 'Conditions d’utilisation',
        privacy: 'Politique de confidentialité',
        refunds: 'Politique de non remboursement',
        retrieval: 'Chargement du document…',
        unavailable: 'Document indisponible',
        unavailableBody: 'Document introuvable ou accès insuffisant.',
        failed: 'Échec de chargement',
        missing: 'Document manquant :',
        protocol: 'Protocole officiel',
        acknowledgeClose: 'Valider & fermer',
      },

      floating: {
        quickBuy: 'Achat rapide',
        godView: 'GOD VIEW',
      },

      profile: {
        title: 'Profil',
        settings: 'Paramètres du profil',
        username: 'Nom d’utilisateur',
        firstName: 'Prénom',
        lastName: 'Nom',
        password: 'Mot de passe',
        avatar: 'Avatar',
        logoutInfo: 'Logout is always available.',
      },
    },

    ru: {
      langName: { en: 'Английский', he: 'Иврит', ar: 'Арабский', fr: 'Французский', ru: 'Русский' },

      common: {
        close: 'Закрыть',
        back: 'Назад',
        continue: 'Продолжить',
        cancel: 'Отмена',
        save: 'Сохранить',
        saved: 'Сохранено.',
        logout: 'Выйти',
        open: 'Открыть',
        yes: 'Да',
        no: 'Нет',
      },

      shell: {
        premiumPlatform: 'Платформа премиум участников',
        live: 'Онлайн',
        status: 'Статус',
        open: 'Открыто',
        closed: 'Закрыто',
        latency: 'Задержка',
        terminate: 'Завершить',
        systemStatus: 'Состояние системы',
        operational: 'Работает',
        documents: 'Документы',
        infoCenter: 'Инфоцентр',
      },

      nav: {
        lobby: 'Стратегический лобби',
        dashboard: 'Панель управления',
        godView: 'God View',
        table: 'Стол',
        takeSeat: 'Занять место',
      },

      auth: {
        portalTitle: 'Портал стратегического доступа',
        operativeId: 'Логин',
        usernamePh: 'Имя пользователя…',
        secureClearance: 'Пароль',
        authEnter: 'Войти',
        or: 'Или',
        guestEnter: 'Войти как гость (наблюдатель)',
        newIdentity: 'Создать новую личность',

        identityCreation: 'Создание личности',
        firstName: 'Имя',
        lastName: 'Фамилия',
        privacyProtocolTitle: 'Протокол приватности:',
        privacyProtocolBody: 'Данные личности используются только внутри системы и видны на уровне ADMIN ROOT.',
        aliasVisible: 'Псевдоним (видимый)',
        password: 'Пароль',
        finalize: 'Завершить',
        returnLogin: 'Назад к входу',

        errEnterUserPass: 'Введите имя пользователя и пароль.',
        errAliasRequired: 'Псевдоним обязателен.',
        errPasswordRequired: 'Пароль обязателен.',
        errStoreNotReady: 'Store не готов. Обновите страницу.',
      },

      access: {
        restrictedTitle: 'Доступ ограничен',
        restrictedBody: 'Обнаружен режим наблюдателя. Закрытые разделы и защищённые шлюзы заблокированы. Создайте подтверждённую личность для операций CROWN.',
        registerIdentity: 'Регистрация',
      },

      lobby: {
        title: 'Стратегический лобби',
        subtitle: 'Выберите стол. Чтобы войти, игрок должен занять место.',
        initialSupply: 'Начальный объём',
        observeLobby: 'Наблюдать',
        enterStaff: 'Войти (персонал)',
        joinQueue: 'Комната ожидания',
        sitNow: 'СЕСТЬ',
        tableId: 'ID стола',
        blinds: 'Блайнды',
        profile: 'Профиль',
        observationMode: 'Режим наблюдения',
        guestsObserve: 'Гости могут наблюдать. Чтобы играть, зарегистрируйтесь.',
        register: 'Регистрация',
      },

      waiting: {
        title: 'Комната ожидания',
        unavailableTitle: 'Комната ожидания недоступна',
        noTable: 'Стол не выбран.',
        backToLobby: 'Назад в лобби',
        scanning: 'Сканирование',
        staffAccess: 'Доступ персонала',
        staffAccessBody: 'Вы просматриваете комнату ожидания как персонал. Вы не учитываетесь как игрок.',
        revokeExit: 'Выйти из очереди',
        observeTable: 'Наблюдать стол',
        seatsFillAuto: 'Места занимают автоматически, когда появляется доступная позиция.',
        capacityThreshold: 'Порог вместимости',
        queueIntel: 'Инфо очереди',
        yourPosition: 'Ваша позиция',
        seatAutoInfo: 'Если освобождается место, первый в очереди садится автоматически.',
      },

      checkout: {
        lockedTitle: 'Оплата заблокирована',
        lockedBody: 'Гости могут наблюдать. Зарегистрируйтесь, чтобы купить CROWN.',
        buyCrown: 'Купить CROWN',
        cryptoCheckout: 'Крипто оплата',
        standardOnly: 'Только стандартная покупка. Без промо.',
        valueModel: 'Модель стоимости',
        amountUSDT: 'Сумма (USDT)',
        network: 'Сеть',
        networksWarning: 'Поддерживаются сети USDT: {{TRC20}} и {{ERC20}} только. Депозит и вывод в одной сети. Отправка в неверной сети может привести к потере средств.',
        calculation: 'Расчёт',
        youReceive: 'Вы получите',
        breakdown: 'Разбивка USDT',
        gross: 'Брутто',
        networkFee: 'Комиссия сети',
        netCredited: 'Чистый кредит',
        notes: 'Примечания',
        notesBody: 'Без вступительных сборов и комиссии платформы. Только комиссия сети.',
        addressShown: 'Адрес сети показан в панели счета.',
        createInvoice: 'Создать счет',
        pendingJoin: 'Вход за стол после оплаты:',

        status_waiting: 'Ожидание',
        status_confirming: 'Подтверждение',
        status_finished: 'Подтверждено',

        invoice: 'Счет',
        noInvoice: 'Нет активного счета',
        createInvoiceTip: 'Создайте счет, чтобы видеть статус и подтверждения.',
        tip: 'Совет',
        trcCheaper: '{{TRC20}} обычно дешевле.',
        statusLabel: 'Статус',
        sendExactly: 'Отправьте ровно',
        address: 'Адрес',
        confirmations: 'Подтверждения',
        simulateTick: 'Симулировать подтверждение',
        credited: 'Зачислено',
        addedToWallet: '{{amount}} CROWN добавлено в кошелёк.',
        txid: 'TXID',
      },

      docs: {
        hubTitle: 'Документы',
        hubHeadline: 'Инфоцентр',
        hubSub: 'Только {{TRC20}} и {{ERC20}} • Комиссия сети',
        wallets: 'Кошельки и сети',
        buyCrown: 'Как купить CROWN',
        convert: 'Конвертация CROWN в USDT',
        terms: 'Условия использования',
        privacy: 'Политика конфиденциальности',
        refunds: 'Политика без возврата',
        retrieval: 'Загрузка документа…',
        unavailable: 'Документ недоступен',
        unavailableBody: 'Документ не найден или нет доступа.',
        failed: 'Ошибка загрузки',
        missing: 'Документ отсутствует:',
        protocol: 'Официальный протокол',
        acknowledgeClose: 'Подтвердить и закрыть',
      },

      floating: {
        quickBuy: 'Быстрая покупка',
        godView: 'GOD VIEW',
      },

      profile: {
        title: 'Профиль',
        settings: 'Настройки профиля',
        username: 'Имя пользователя',
        firstName: 'Имя',
        lastName: 'Фамилия',
        password: 'Пароль',
        avatar: 'Аватар',
        logoutInfo: 'Выход всегда доступен.',
      },
    },
  };

  function deepGet(obj, path) {
    const parts = String(path || '').split('.').filter(Boolean);
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || !(p in cur)) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function t(key, vars = null) {
    const lang = getLang();
    const pack = STRINGS[lang] || STRINGS.en;
    const fallback = STRINGS.en;

    let raw = deepGet(pack, key);
    if (raw === undefined) raw = deepGet(fallback, key);
    if (raw === undefined) raw = String(key || '');

    let out = String(raw);

    if (vars && typeof vars === 'object') {
      for (const k of Object.keys(vars)) {
        out = out.split(`{{${k}}}`).join(String(vars[k]));
      }
    }

    return out;
  }

  function renderLangSelect({ className = '', withLabel = false } = {}) {
    const lang = getLang();
    const label = withLabel ? `<div class="text-[9px] text-rcSlate uppercase tracking-widest font-bold mb-1">${escapeHtml(t('common.language') || 'Language')}</div>` : '';

    return `
      ${label}
      <select onchange="window.setLanguage(this.value)" class="${className}">
        <option value="he" ${lang==='he'?'selected':''}>עברית</option>
        <option value="ar" ${lang==='ar'?'selected':''}>العربية</option>
        <option value="en" ${lang==='en'?'selected':''}>English</option>
        <option value="fr" ${lang==='fr'?'selected':''}>Français</option>
        <option value="ru" ${lang==='ru'?'selected':''}>Русский</option>
      </select>
    `;
  }

  // Public API
  window.ROYAL_I18N = {
    t,
    getLang,
    getLocale,
    isRTL,
    escapeHtml,
    wrapLTR,
    formatNumber,
    formatMoney,
    formatDateTime,
    renderLangSelect,
  };

  // Convenience globals
  window.t = t;
  window.formatNumber = formatNumber;
  window.formatMoney = formatMoney;
  window.formatDateTime = formatDateTime;
  window.wrapLTR = wrapLTR;
  window.i18nIsRTL = isRTL;
})();
