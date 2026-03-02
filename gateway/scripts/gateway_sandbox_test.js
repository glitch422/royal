/**
 * ==========================================
 * ROYAL - GATEWAY SANDBOX TEST (PASS/FAIL)
 * ==========================================
 * Runs an end-to-end check:
 * 1) Finds a user in DB by email (service role)
 * 2) Signs a JWT (Bearer)
 * 3) Creates an invoice via /api/v1/gateway/invoices
 * 4) Optionally attaches a tx hash (TEST_TX_HASH)
 * 5) Runs worker ticks (in-process) until CREDITED or timeout
 * 6) Verifies:
 *    - invoice CREDITED
 *    - exactly-once credit (DB enforced)
 *    - user balance increased by amount
 */

require('dotenv').config();

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const ethWorker = require('../workers/gatewayEthWorker');
const tronWorker = require('../workers/gatewayTronWorker');

function mustEnv(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const apiBase = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api/v1';
  const testNetwork = (process.env.TEST_NETWORK || 'ERC20').toUpperCase();
  const testEmail = mustEnv('TEST_EMAIL');
  const testRole = (process.env.TEST_ROLE || 'player').toLowerCase();
  const testTxHash = process.env.TEST_TX_HASH || '';
  const timeoutSec = Number(process.env.TEST_TIMEOUT_SECONDS || 300);
  const pollMs = Number(process.env.TEST_POLL_MS || 2000);

  const supabaseUrl = mustEnv('SUPABASE_URL');
  const supabaseKey = mustEnv('SUPABASE_SERVICE_ROLE_KEY');
  const jwtSecret = mustEnv('JWT_SECRET');

  const sb = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: user, error } = await sb
    .from('users')
    .select('id, username, email, role, balance')
    .eq('email', testEmail)
    .maybeSingle();

  if (error) throw error;
  if (!user) throw new Error(`User not found for TEST_EMAIL=${testEmail}`);

  const token = jwt.sign(
    { id: user.id, role: testRole, username: user.username },
    jwtSecret,
    { expiresIn: '30m' }
  );

  const http = axios.create({
    baseURL: apiBase,
    timeout: 30_000,
    headers: { Authorization: `Bearer ${token}` },
  });

  const balBefore = Number(user.balance || 0);

  console.log('Creating invoice…');
  const invRes = await http.post('/gateway/invoices', { network: testNetwork, amountUsd: 2 });
  const invoiceId = invRes.data?.data?.invoiceId;
  if (!invoiceId) throw new Error('Create invoice failed: missing invoiceId');

  console.log(`Invoice created: ${invoiceId}`);
  console.log(`Deposit address: ${invRes.data.data.depositAddress}`);

  if (testTxHash) {
    console.log(`Attaching client tx hash: ${testTxHash}`);
    await http.post(`/gateway/invoices/${invoiceId}/client-tx`, { network: testNetwork, txHash: testTxHash });
  } else {
    console.log('No TEST_TX_HASH provided. Send 2 USDT to the deposit address, then rerun with TEST_TX_HASH.');
    console.log('You can still keep this running and attach tx from a separate call to client-tx endpoint.');
  }

  const start = Date.now();
  let creditedAmount = null;

  while (Date.now() - start < timeoutSec * 1000) {
    // Run worker tick
    if (testNetwork === 'ERC20') {
      await ethWorker.runOnce();
    } else if (testNetwork === 'TRC20') {
      await tronWorker.runOnce();
    } else {
      throw new Error(`Unsupported TEST_NETWORK: ${testNetwork}`);
    }

    const st = await http.get(`/gateway/invoices/${invoiceId}/status`);
    const data = st.data?.data;
    const status = data?.status;

    console.log(`Status: ${status} | confirmations ${data?.confirmations}/${data?.requiredConfirmations}`);

    if (status === 'CREDITED') {
      creditedAmount = Number(data?.receivedAmountUsd || data?.chain?.amountUsd || 0);
      break;
    }

    await sleep(pollMs);
  }

  if (creditedAmount === null) {
    console.error('SANDBOX TEST FAILED: timeout waiting for CREDITED');
    process.exit(2);
  }

  // Re-read user balance
  const { data: userAfter, error: e2 } = await sb
    .from('users')
    .select('balance')
    .eq('id', user.id)
    .maybeSingle();
  if (e2) throw e2;

  const balAfter = Number(userAfter?.balance || 0);
  const delta = Math.round((balAfter - balBefore) * 1e6) / 1e6;

  if (Math.abs(delta - creditedAmount) > 1e-6) {
    console.error(`SANDBOX TEST FAILED: balance delta mismatch. delta=${delta} credited=${creditedAmount}`);
    process.exit(3);
  }

  console.log('SANDBOX TEST PASSED');
  console.log(`Credited: ${creditedAmount} USD | Balance delta: ${delta}`);
}

main().catch((e) => {
  console.error('SANDBOX TEST FAILED:', e.message);
  process.exit(1);
});
