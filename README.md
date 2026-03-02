# ROYAL - Unified Frontend Frontend (Luxury Edition)

## Overview
This is the definitive, offline functional frontend for **ROYAL**. It combines the V2 business rules (Stealth Mode, 50 CROWN minimums, strict USDT networks) with the premium Tailwind CSS luxury design and the Admin "God View" (Live Peek) interface.

## How to Run
1. Extract the files to a local folder.
2. Open `index.html` in any modern browser (Chrome/Edge/Brave recommended).
3. No local server is required for this static frontend.

## Core Features Included
* **Stealth Mode (Pre-Login):** The landing page is completely generic ("ROYAL Premium Assets"). No platform tables or platform elements are visible to unauthenticated users or payment gateway bots.
* **Role Switcher (Demo Only):** Use the top navigation bar to switch between `Guest`, `Player`, `CFO`, and `Root`.
* **Withdrawal Logic:**
    * Minimum withdrawal is **50 CROWN** (500 USDT).
    * The "Withdraw" button is **hidden** if the user balance is below 50 CROWN.
    * The "Withdraw" button is **hidden** if the Root admin turns off the global Withdrawal system (Kill Switch).
* **Network Normalization:** UI shows user-friendly names (TRC20, ERC20), but prepares the strict backend codes (`usdttrc20`).
* **God View (Live Peek):** When logged in as `Root` or `CFO`, an exclusive dashboard appears showing hidden hole cards and future deck sequences, styled with premium dark/glass UI.

## File Structure
* `index.html` - The complete Single Page Application (SPA) frontend utilizing Tailwind CSS via CDN and vanilla JavaScript for state management.
* `README.md` - This documentation file.

## Developer Notes
All code inside `index.html` is extensively commented in English. The React version of `AdminLivePeek` has been manually translated into HTML template literals here so UI/UX designers can preview the exact layout without running a Node.js/Vite environment.
