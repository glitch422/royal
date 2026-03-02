# ROYAL - STRATEGIC COMMAND CENTER (God View Module)

## Overview
The `AdminLivePeek.jsx` component is a highly secure, React-based dashboard interface explicitly designed for **Root** and **Admin** roles. It completely bypasses the standard module visibility ("fog-of-war"), revealing all hidden data (Hole Cards) of every user and predicting the future deck sequence via Provably Fair hashes.

**Notice:** This module operates strictly under the ROYAL Stealth Protocol. All UI elements reflect "Strategic Asset Management" terminology rather than gambling terminology.

**Component Location:** `react_admin_panel_example/components/AdminLivePeek.jsx`

## Security & Hierarchy Rules (Access Control)
This component enforces a rigid command hierarchy. The action buttons (Kick/Ban) are dynamically rendered based on the logged-in user's role:
* **Root:** Ultimate authority. Can Kick/Ban anyone. Invisible to players (Ghost Mode).
* **Admin:** Can Kick/Ban Support, CFO, and Players. Cannot affect Root. Invisible to players (Ghost Mode).
* **Support:** Can Kick/Ban Players only. Cannot affect higher tiers.
* **CFO:** Financial oversight only. No Kick/Ban privileges.

## UI/UX Requirements
This component is styled with a **Luxury Command Center Theme**. To render the aesthetics correctly, the host React application **must** have the following configured:
1. **Tailwind CSS** with the following custom hex colors extended in `tailwind.config.js`:
   * Deep Navy: `#0B223A`, `#061423`, `#0f2942`, `#1a365d`
   * Royal Gold: `#D4AF37`
   * Emerald (Assets): `#10b981`
   * Crimson (Actions): `#dc2626`
2. **React Context API:**
   * `SocketContext`: Intercepts the secure `god_view_update` event and handles `emitKick` / `emitBan`.
   * `AuthContext`: Provides the current user's role for hierarchy validation.

## Financial Logic (CROWN)
All numerical values represented in this component (Stack, Bet, Pot) are denominated in **CROWN (CR)**, where:
* 1 CROWN = 10 USDT.
* Minimum Module Entry (Buy-In) = 25 CROWN.

## Data Structure Expected from `useSocket()`
The component expects the `useSocket()` hook to provide a `godView` object. This object is securely broadcasted by the backend *only* to verified JWTs holding administrative clearance.

### Example Payload:
```json
{
  "tableId": "strategic_module_vip_1",
  "pot": 150,
  "state": "FLOP",
  "players": [
    {
      "id": "usr_123",
      "username": "Alpha_Trader",
      "role": "player",
      "chips": 80,
      "currentBet": 25,
      "status": "ACTIVE",
      "holeCards": [
        { "value": "A", "suit": "spades" },
        { "value": "K", "suit": "hearts" }
      ]
    },
    {
      "id": "usr_456",
      "username": "Support_Elite",
      "role": "support",
      "chips": 25,
      "currentBet": 0,
      "status": "FOLDED",
      "holeCards": [
        { "value": "2", "suit": "clubs" },
        { "value": "7", "suit": "hearts" }
      ]
    },
    {
      "id": "usr_789",
      "username": "Whale_99",
      "role": "player",
      "chips": 450,
      "currentBet": 125,
      "status": "ALL_IN",
      "holeCards": [
        { "value": "Q", "suit": "spades" },
        { "value": "Q", "suit": "diamonds" }
      ]
    }
  ],
  "futureCards": [
    { "value": "J", "suit": "diamonds" },
    { "value": "10", "suit": "spades" },
    { "value": "2", "suit": "hearts" }
  ]
}
