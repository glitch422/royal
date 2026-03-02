# 06 - How to convert CROWN to USDT (Withdraw)

Effective date: 2026-02-21

This document explains how to withdraw by converting CROWN to USDT.

---

Supported USDT networks on ROYAL:
- TRC20 (Tron)
- ERC20 (Ethereum)

Important: the network must match exactly on both sides (sender and recipient).

Confirmations:
- Your payment is credited after NOWPayments detects enough blockchain confirmations and sends a status update (for example: waiting → confirming → confirmed/finished).
- Confirmation time depends on the selected network and current congestion.

---

## 1) Withdraw button visibility rules
Show Withdraw only if:
1) GET /api/v1/admin/system/status returns withdrawalsActive: true
2) User balance is at least 500 USDT equivalent (50 CROWN)

Otherwise hide it completely (display: none).

---

## 2) Minimum amount
Minimum withdrawal amount is 50 CROWN.
If less than 50, show:
"Minimum withdrawal is 50 CROWN"

---

## 3) Networks
Supported networks:
- TRC20
- ERC20

---

## 4) Steps
1) Wallet or Balance
2) Withdraw or Convert to USDT
3) Enter CROWN amount (minimum 50)
4) Choose network
5) Paste destination address
6) Review and submit

---

## 5) Statuses
pending, approved, rejected, sent (with TXID).

Support: [Support Email]
