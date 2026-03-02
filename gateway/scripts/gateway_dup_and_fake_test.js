/**
 * ROYAL GATEWAY - DUPLICATES + DOUBLE CREDIT + FAKE TOKEN
 *
 * MODE=sim:
 * - Creates an invoice
 * - Inserts a synthetic CONFIRMED chain tx into gateway_chain_transactions
 * - Verifies UNIQUE(network, tx_hash, log_index) blocks duplicates
 * - Calls DB RPC gateway_credit twice and verifies "exactly once" credit
 *
 * MODE=testnet:
 * - Requires FAKE_TX_HASH_ERC20 and/or FAKE_TX_HASH_TRC20
 * - Attaches tx to a new invoice
 * - Optional: RUN_WORKERS_ONCE=1 to run in-process worker ticks
 * - Expects invoice to land in NEEDS_REVIEW (TOKEN_MISMATCH / WRONG_CONTRACT)
 *
 * Run:
 *   MODE=sim DOTENV_PATH=.env.tests node scripts/gateway_dup_and_fake_test.js
 *   MODE=testnet FAKE_TX_HASH_ERC20=0x.. DOTENV_PATH=.env.testnet node scripts/gateway_dup_and_fake_test.js
 */

const dotenv = require('dotenv');
dotenv.config({ path: process.env.DOTENV_PATH || '.env' });

const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function must(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}

const MODE = (process.env.MODE || 'sim').toLowerCase();
const API = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api/v1';

const sb = createClient(must('SUPABASE_URL'), must('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

function cookieFromJar(jarPath) {
  if (!jarPath || !fs.existsSync(jarPath)) return null;
  const txt = fs.readFileSync(jarPath, 'utf8');
  const line = txt.split('\n').find(l => l.includes('\tjwt\t'));
  if (!line) return null;
  const parts = line.split('\t');
  const value = parts[parts.length - 1]?.trim();
  if (!value) return null;
  return `jwt=${value}`;
}

async function getCookieHeader() {
  if (process.env.COOKIE) return process.env.COOKIE.startsWith('jwt=') ? process.env.COOKIE : `jwt=${process.env.COOKIE}`;
  const jar = process.env.COOKIE_JAR || 'cookies.txt';
  if (fs.existsSync(jar)) {
    const c = cookieFromJar(jar);
    if (c) return c;
  }

  const email = must('TEST_EMAIL');
  const password = must('TEST_PASSWORD');
  const res = await axios.post(`${API}/auth/login`, { email, password }, { validateStatus: () => true });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.data)}`);
  const setCookie = res.headers['set-cookie'];
  if (!setCookie || !setCookie.length) throw new Error('No Set-Cookie returned');
  return setCookie[0].split(';')[0];
}

async function createInvoice(cookie, network) {
  const res = await axios.post(`${API}/gateway/invoices`, { network }, {
    headers: { Cookie: cookie },
    validateStatus: () => true
  });
  if (res.status !== 201) throw new Error(`Create invoice failed ${network}: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data.data.invoiceId;
}

function randHex(nBytes) { return crypto.randomBytes(nBytes).toString('hex'); }

async function simDupAndIdempotency() {
  const cookie = await getCookieHeader();
  const invoiceId = await createInvoice(cookie, 'ERC20');

  const USDT_ERC20 = must('USDT_CONTRACT_ERC20');

  const { data: inv, error: invErr } = await sb
    .from('gateway_invoices')
    .select('id,user_id,deposit_address')
    .eq('id', invoiceId)
    .single();
  if (invErr) throw invErr;

  const userId = inv.user_id;

  const { data: u0, error: u0e } = await sb.from('users').select('balance').eq('id', userId).single();
  if (u0e) throw u0e;
  const bal0 = Number(u0.balance);

  const txHash = '0x' + randHex(32);
  const logIndex = 7;
  const amountUsd = 3.25;

  // Insert chain tx (first time)
  const { data: tx1, error: txErr1 } = await sb.from('gateway_chain_transactions').insert({
    network: 'ERC20',
    tx_hash: txHash,
    log_index: logIndex,
    event_id: '',
    token_contract: USDT_ERC20.toLowerCase(),
    from_address: '0x' + randHex(20),
    to_address: String(inv.deposit_address).toLowerCase(),
    amount_raw: String(Math.floor(amountUsd * 1e6)),
    amount_usd: amountUsd,
    block_number: 123,
    block_hash: '0x' + randHex(32),
    status: 'CONFIRMED',
    confirmations: 999
  }).select('id').single();
  if (txErr1) throw txErr1;

  // Link invoice -> chain tx
  const { error: linkErr } = await sb.from('gateway_invoice_tx_links').insert({
    invoice_id: invoiceId,
    chain_tx_id: tx1.id
  });
  if (linkErr) throw linkErr;

  // Try duplicate insert (must fail due to unique index)
  const { error: txErr2 } = await sb.from('gateway_chain_transactions').insert({
    network: 'ERC20',
    tx_hash: txHash,
    log_index: logIndex,
    event_id: '',
    token_contract: USDT_ERC20.toLowerCase(),
    amount_raw: '1',
    amount_usd: 0.000001
  });
  if (!txErr2) throw new Error('Expected duplicate insert to fail, but it succeeded');

  // Credit once (RPC)
  const { data: c1, error: c1e } = await sb.rpc('gateway_credit', {
    invoice_id: invoiceId,
    user_id: userId,
    chain_tx_id: tx1.id,
    amount_usd: amountUsd
  });
  if (c1e) throw c1e;
  if (c1 !== true) throw new Error('Expected first credit to return true');

  // Credit twice (must return false and not change balance)
  const { data: c2, error: c2e } = await sb.rpc('gateway_credit', {
    invoice_id: invoiceId,
    user_id: userId,
    chain_tx_id: tx1.id,
    amount_usd: amountUsd
  });
  if (c2e) throw c2e;
  if (c2 !== false) throw new Error('Expected second credit to return false');

  const { data: u1, error: u1e } = await sb.from('users').select('balance').eq('id', userId).single();
  if (u1e) throw u1e;

  const bal1 = Number(u1.balance);
  if (Math.abs((bal1 - bal0) - amountUsd) > 1e-6) {
    throw new Error(`Balance mismatch. Expected +${amountUsd}, got +${bal1 - bal0}`);
  }

  console.log('✅ DUP + DOUBLE-CREDIT (SIM) PASSED');
}

async function testnetFakeToken() {
  const cookie = await getCookieHeader();

  const FAKE_TX_ERC20 = process.env.FAKE_TX_HASH_ERC20 || '';
  const FAKE_TX_TRC20 = process.env.FAKE_TX_HASH_TRC20 || '';
  if (!FAKE_TX_ERC20 && !FAKE_TX_TRC20) {
    throw new Error('Set FAKE_TX_HASH_ERC20 and/or FAKE_TX_HASH_TRC20');
  }

  async function runWorkersOnceOptional() {
    if (String(process.env.RUN_WORKERS_ONCE || '') !== '1') return;
    const ethWorker = require('../workers/gatewayEthWorker');
    const tronWorker = require('../workers/gatewayTronWorker');
    await ethWorker.runOnce();
    await tronWorker.runOnce();
  }

  if (FAKE_TX_ERC20) {
    const invoiceId = await createInvoice(cookie, 'ERC20');
    await axios.post(`${API}/gateway/invoices/${invoiceId}/client-tx`, { txHash: FAKE_TX_ERC20, network: 'ERC20' }, {
      headers: { Cookie: cookie },
      validateStatus: () => true
    });
    for (let i = 0; i < 5; i++) await runWorkersOnceOptional();

    const { data: inv, error } = await sb.from('gateway_invoices').select('status').eq('id', invoiceId).single();
    if (error) throw error;
    if (inv.status !== 'NEEDS_REVIEW') throw new Error(`Expected NEEDS_REVIEW for ERC20 fake token, got ${inv.status}`);
    console.log('✅ FAKE TOKEN ERC20 -> NEEDS_REVIEW OK');
  }

  if (FAKE_TX_TRC20) {
    const invoiceId = await createInvoice(cookie, 'TRC20');
    await axios.post(`${API}/gateway/invoices/${invoiceId}/client-tx`, { txHash: FAKE_TX_TRC20, network: 'TRC20' }, {
      headers: { Cookie: cookie },
      validateStatus: () => true
    });
    for (let i = 0; i < 5; i++) await runWorkersOnceOptional();

    const { data: inv, error } = await sb.from('gateway_invoices').select('status').eq('id', invoiceId).single();
    if (error) throw error;
    if (inv.status !== 'NEEDS_REVIEW') throw new Error(`Expected NEEDS_REVIEW for TRC20 fake token, got ${inv.status}`);
    console.log('✅ FAKE TOKEN TRC20 -> NEEDS_REVIEW OK');
  }
}

async function main() {
  if (MODE === 'sim') {
    await simDupAndIdempotency();
    console.log('✅ ALL SIM TESTS PASSED');
    return;
  }
  if (MODE === 'testnet') {
    await testnetFakeToken();
    console.log('✅ ALL TESTNET FAKE TOKEN TESTS PASSED');
    return;
  }
  throw new Error('MODE must be sim or testnet');
}

main().catch((e) => {
  console.error('❌ DUP/FAKE TEST FAILED:', e.message);
  process.exit(1);
});
