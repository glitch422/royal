<div dir="rtl">

# 06 - تحويل CROWN إلى USDT (السحب)

تاريخ السريان: 2026-02-21

- يظهر زر Withdraw فقط إذا withdrawalsActive=true ورصيد ≥ 500 USDT (50 CROWN)
- الحد الأدنى: 50 CROWN (أقل من ذلك: "Minimum withdrawal is 50 CROWN")
- الشبكات: TRC20, ERC20
- الخطوات: Wallet → Withdraw → amount → network → address → submit
- الحالات: pending/approved/rejected/sent مع TXID

الدعم: [Support Email]

</div>


شبكات USDT المدعومة على ROYAL:
- TRC20 (Tron)
- ERC20 (Ethereum)

مهم: يجب أن تتطابق الشبكة تماماً لدى المرسل والمستلم.

التأكيدات (Confirmations):
- يتم إضافة الرصيد بعد أن ترصد NOWPayments عدد التأكيدات المطلوب وترسل تحديث حالة (مثل: waiting → confirming → confirmed/finished).
- وقت التأكيد يعتمد على الشبكة والازدحام.
