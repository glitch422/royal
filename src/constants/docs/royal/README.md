# ROYAL - Frontend Documents (Detailed, 4 Languages)

Last updated: 2026-02-21

This folder contains 6 documents in 4 languages:
- he (Hebrew, RTL)
- en (English)
- ar (Arabic, RTL)
- fr (French)

## Recommended placement in the Frontend
- Document 01 and Document 02:
  Display during Sign Up and on the Buy CROWN screen.
- Document 06:
  Display inside the Convert or Withdraw flow (the modal or page where the user converts CROWN to USDT).
- Documents 03, 04, 05:
  Display in the footer.

## Withdraw UI rules (must match product requirements)
Show the Withdraw button only if BOTH conditions are true:
1) GET /api/v1/admin/system/status returns withdrawalsActive: true
2) The user's total balance is at least 500 USDT equivalent (which equals 50 CROWN)

If either condition is false:
- Hide the Withdraw button completely (display: none).

When the Withdraw modal opens:
- Enforce minimum amount: 50 CROWN
- If the user enters less than 50 CROWN, show a red validation error:
  "Minimum withdrawal is 50 CROWN"

## Placeholders
Replace these placeholders before production:
- [Company Legal Name]
- [Company Address]
- [Support Email]
- [Support Ticket URL] (optional)
- [Governing Law / Jurisdiction]

## Content note
These documents are educational and operational. They do not contain financial advice.


## Supported USDT networks
- TRC20
- ERC20

Confirmations are handled via NOWPayments status updates (waiting → confirming → confirmed/finished).
