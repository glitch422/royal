/**
 * Gateway E2E - SIM + TESTNET
 * - MODE=sim: No real transfers. Simulates CONFIRMED onchain tx rows in DB and credits user once.
 * - MODE=testnet: Delegates to gateway_testnet_e2e_both.js if present (real testnet transfers).
 *
 * Required env (SIM):
 * - DOTENV_PATH (optional) e.g. .env.tests
 * - TEST_API_BASE_URL (default http://localhost:3000/api/v1)
 * - TEST_EMAIL, TEST_PASSWORD
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - USDT_CONTRACT_ERC20 (and USDT_CONTRACT_TRC20 if you want TRC20 in sim)
 *
 * Optional:
 * - E2E_NETWORKS="ERC20,TRC20"
 * - E2E_AMOUNT=1   (USD)
 */

const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Load env file if provided
const dotenvPath = process.env.DOTENV_PATH || process.env.dotenv_config_path || '';
if (dotenvPath) {
  require('dotenv').config({ path: dotenvPath, override: true });
} else {
  require('dotenv').config();
}

function must(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

const MODE = (process.env.MODE || 'sim').toLowerCase();
const API = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api/v1';

const EMAIL = process.env.TEST_EMAIL || '';
const PASS = process.env.TEST_PASSWORD || '';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const E2E_AMOUNT = Number(process.env.E2E_AMOUNT || 1);
const E2E_NETWORKS = (process.env.E2E_NETWORKS || 'ERC20,TRC20')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const USDT_ERC20 = process.env.USDT_CONTRACT_ERC20 || '';
const USDT_TRC20 = process.env.USDT_CONTRACT_TRC20 || '';

const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

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

function randHex(nBytes) {
  return crypto.randomBytes(nBytes).toString('hex');
}

async function loginCookie() {
  if (!EMAIL || !PASS) throw new Error('Missing TEST_EMAIL / TEST_PASSWORD for login');
  const res = await axios.post(`${API}/auth/login`, { email: EMAIL, password: PASS }, { validateStatus: () => true });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.data)}`);
  const setCookie = res.headers['set-cookie'];
  if (!setCookie || !setCookie.length) throw new Error('No Set-Cookie returned');
  return setCookie[0].split(';')[0]; // jwt=...
}

async function getCookieHeader() {
  if (process.env.COOKIE) return process.env.COOKIE.startsWith('jwt=') ? process.env.COOKIE : `jwt=${process.env.COOKIE}`;
  const jar = process.env.COOKIE_JAR || 'cookies.txt';
  if (fs.existsSync(jar)) {
    const c = cookieFromJar(jar);
    if (c) return c;
  }
  // fallback: login
  if (!EMAIL || !PASS) {
    throw new Error('Missing auth: provide cookies.txt (COOKIE_JAR) or set TEST_EMAIL + TEST_PASSWORD');
  }
  return loginCookie();
}

async function createInvoice(cookie, network) {
  const res = await axios.post(`${API}/gateway/invoices`, { network }, {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  });
  if (res.status !== 201) throw new Error(`Create invoice failed ${network}: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data.data;
}

async function getUserBalance(userId) {
  const { data, error } = await sb.from('users').select('balance').eq('id', userId).single();
  if (error) throw error;
  return Number(data.balance || 0);
}

async function insertConfirmedChainTx({ network, tokenContract, toAddress, amountUsd }) {
  // amount_raw is micro units (6 decimals)
  const amountRaw = String(Math.floor(amountUsd * 1e6));

  const payload = {
    network,
    tx_hash: network === 'ERC20' ? ('0x' + randHex(32)) : randHex(32), // tron txid is hex string without 0x in many cases
    log_index: network === 'ERC20' ? 7 : 0,
    event_id: network === 'TRC20' ? ('evt_' + randHex(8)) : '',
    token_contract: network === 'ERC20' ? String(tokenContract || '').toLowerCase() : String(tokenContract || ''),
    from_address: network === 'ERC20' ? ('0x' + randHex(20)) : ('T' + randHex(20)).slice(0, 34),
    to_address: network === 'ERC20' ? String(toAddress).toLowerCase() : String(toAddress),
    amount_raw: amountRaw,
    amount_usd: amountUsd,
    block_number: 123,
    block_hash: network === 'ERC20' ? ('0x' + randHex(32)) : randHex(32),
    status: 'CONFIRMED',
    confirmations: 999,
  };

  const { data, error } = await sb
    .from('gateway_chain_transactions')
    .insert(payload)
    .select('id, tx_hash')
    .single();

  if (error) throw error;
  return data;
}

async function linkInvoice(invoiceId, chainTxId) {
  const { error } = await sb.from('gateway_invoice_tx_links').insert({
    invoice_id: invoiceId,
    chain_tx_id: chainTxId,
  });
  if (error) throw error;
}

async function credit(invoiceId, userId, chainTxId, amountUsd) {
  const { data, error } = await sb.rpc('gateway_credit', {
    invoice_id: invoiceId,
    user_id: userId,
    chain_tx_id: chainTxId,
    amount_usd: amountUsd,
  });
  if (error) throw error;
  return data; // true on first credit, false if already credited
}

async function simRun() {
  if (!sb) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for SIM E2E');
  const cookie = await getCookieHeader();

  const results = [];

  for (const net of E2E_NETWORKS) {
    if (net === 'ERC20' && !USDT_ERC20) {
      console.log('⚠️ Skipping ERC20 sim: missing USDT_CONTRACT_ERC20 in env');
      continue;
    }
    if (net === 'TRC20' && !USDT_TRC20) {
      console.log('⚠️ Skipping TRC20 sim: missing USDT_CONTRACT_TRC20 in env');
      continue;
    }

    const inv = await createInvoice(cookie, net);

    // Load invoice row to get user_id + deposit address
    const { data: invRow, error: invErr } = await sb
      .from('gateway_invoices')
      .select('id, user_id, deposit_address')
      .eq('id', inv.invoiceId)
      .single();

    if (invErr) throw invErr;

    const userId = invRow.user_id;
    const bal0 = await getUserBalance(userId);

    const tokenContract = net === 'ERC20' ? USDT_ERC20 : USDT_TRC20;
    const chainTx = await insertConfirmedChainTx({
      network: net,
      tokenContract,
      toAddress: invRow.deposit_address,
      amountUsd: E2E_AMOUNT,
    });

    await linkInvoice(inv.invoiceId, chainTx.id);

    const first = await credit(inv.invoiceId, userId, chainTx.id, E2E_AMOUNT);
    if (first !== true) throw new Error(`Expected first credit true for ${net}, got ${first}`);

    const second = await credit(inv.invoiceId, userId, chainTx.id, E2E_AMOUNT);
    if (second !== false) throw new Error(`Expected second credit false (idempotent) for ${net}, got ${second}`);

    const bal1 = await getUserBalance(userId);
    const delta = bal1 - bal0;

    if (Math.abs(delta - E2E_AMOUNT) > 1e-6) {
      throw new Error(`${net} balance mismatch: expected +${E2E_AMOUNT}, got +${delta}`);
    }

    results.push({ net, invoiceId: inv.invoiceId, chainTx: chainTx.tx_hash, credited: delta });
    console.log(`✅ SIM E2E ${net} PASSED (invoice=${inv.invoiceId}, +${delta})`);
  }

  if (!results.length) throw new Error('No networks tested. Set USDT_CONTRACT_ERC20 and/or USDT_CONTRACT_TRC20.');
  console.log('✅ ALL SIM E2E PASSED');
}

async function testnetRun() {
  // Delegate to full testnet sender if present
  const target = 'scripts/gateway_testnet_e2e_both.js';
  if (!fs.existsSync(target)) {
    throw new Error(`Missing ${target}. Put it in scripts/ and run again.`);
  }
  console.log('Running TESTNET E2E via', target);
  const { spawn } = require('child_process');

  const child = spawn('node', [target], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => process.exit(code || 0));
}

(async () => {
  try {
    if (MODE === 'sim') {
      await simRun();
      process.exit(0);
    }
    if (MODE === 'testnet') {
      await testnetRun();
      return;
    }
    throw new Error('MODE must be sim or testnet');
  } catch (e) {
    console.error('❌ E2E TEST FAILED:', e.message);
    process.exit(1);
  }
})();
