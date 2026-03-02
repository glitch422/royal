# ROYAL Gateway - Setup

## 1) Apply DB migration (Gateway tables)

### Option A: Python (same as you used before)

From `Backend/` (inside your python venv):

```bash
python scripts/apply_gateway_migration.py
```

It will ask:
- project ref
- postgres DB password

### Option B: Supabase SQL Editor

Open `Backend/db/migrations/002_gateway.sql` in Supabase SQL Editor and run.

---

## 2) Add env values (Backend .env)

Minimum required for Gateway:

```env
# Gateway
GATEWAY_MODE="sandbox_mainnet"            # sandbox_mainnet | staging | production
GATEWAY_SUPPORTED_NETWORKS="ERC20,TRC20"
INVOICE_TTL_SECONDS=1800

# Treasury addresses (used in sandbox_mainnet)
TREASURY_ADDRESS_ERC20="0x..."
TREASURY_ADDRESS_TRC20="T..."

# USDT allowlist
USDT_CONTRACT_ERC20="0xdAC17F958D2ee523a2206206994597C13D831ec7"
USDT_CONTRACT_TRC20="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"

# Confirmations
CONFIRMATIONS_ERC20=12
CONFIRMATIONS_TRC20=20

# RPC providers (NO explorer api)
ETH_RPC_HTTP_1="https://..."
ETH_RPC_HTTP_2="https://..."
TRON_RPC_HTTP_1="https://..."            # full node
TRON_RPC_HTTP_2="https://..."            # solidity node (recommended)

# Kill switch
CREDITS_ENABLED=true
```

---

## 3) Start backend

```bash
npm install
node server.js
```

---

## 4) Start workers

In separate terminals:

```bash
node workers/gatewayEthWorker.js
node workers/gatewayTronWorker.js
node workers/gatewayOutboxPublisher.js
```

---

## 5) Sandbox test (PASS/FAIL)

This test:
- creates an invoice
- attaches a tx hash (optional)
- runs worker ticks in-process until CREDITED

Set env:

```env
TEST_API_BASE_URL="http://localhost:3000/api/v1"
TEST_NETWORK="ERC20"                      # or TRC20
TEST_EMAIL="your_player_email_alias@gmail.com"
TEST_ROLE="player"
TEST_TX_HASH="0x..."                      # optional but recommended
TEST_TIMEOUT_SECONDS=300

# must exist for signing
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
JWT_SECRET="..."
```

Run:

```bash
node scripts/gateway_sandbox_test.js
```

If `TEST_TX_HASH` is empty, the script prints the deposit address. Send 2 USDT, then re-run with the tx hash.
