/**
 * ==========================================
 * ROYAL - GATEWAY TRON WORKER (TRC20)
 * ==========================================
 */

// Load env for worker process (supports DOTENV_PATH override)
const path = require('path');
const dotenv = require('dotenv');
const dotenvPath = process.env.DOTENV_PATH
  ? path.resolve(process.env.DOTENV_PATH)
  : path.resolve(process.cwd(), '.env');
dotenv.config({ path: dotenvPath, override: false });

const logger = require('../utils/logger');
const cfg = require('../services/gateway/gatewayConfig');
const db = require('../services/gateway/gatewayDb');
const tron = require('../services/rpc/tronRpc');

const TRANSFER_SIG = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function creditsEnabled() {
  return String(process.env.CREDITS_ENABLED || 'true') === 'true';
}

function normalizeHex(h) {
  return String(h || '').toLowerCase().replace(/^0x/, '');
}

function ensureTronRpc() {
  const full = cfg.rpc.tron.http1;
  const solidity = cfg.rpc.tron.http2 || cfg.rpc.tron.http1;
  if (!full || !solidity) throw new Error('Missing TRON RPC URLs');
  return { full, solidity };
}

function parseTrc20TransferFromTxInfo(txInfo, expectedToEvm20, usdtContractHex21) {
  const logs = txInfo?.log;
  if (!Array.isArray(logs)) return null;

  const usdtHex = normalizeHex(usdtContractHex21);

  for (const l of logs) {
    const addr = normalizeHex(l.address);
    if (addr !== usdtHex) continue;

    const topics = l.topics || [];
    if (topics.length < 3) continue;

    const sig = normalizeHex(topics[0]);
    if (sig !== TRANSFER_SIG) continue;

    // topics[1]/topics[2] are 32-byte. take last 40 hex chars (20 bytes)
    const fromEvm20 = normalizeHex(topics[1]).slice(-40);
    const toEvm20 = normalizeHex(topics[2]).slice(-40);

    if (toEvm20 !== expectedToEvm20) continue;

    const dataHex = normalizeHex(l.data);
    const amountRaw = BigInt('0x' + dataHex);

    return {
      fromEvm20,
      toEvm20,
      amountRaw,
      // TRON log has no logIndex consistently; keep -1
      logIndex: -1,
    };
  }

  return null;
}

async function processInvoiceDetect(invoice) {
  if (!invoice.client_tx_hash) return;

  const { solidity } = ensureTronRpc();

  const usdtBase58 = cfg.usdtContracts.TRC20;
  if (!usdtBase58) throw new Error('Missing USDT_CONTRACT_TRC20');

  const usdtHex21 = tron.tronBase58ToHex(usdtBase58);

  const depositHex21 = tron.tronBase58ToHex(invoice.deposit_address);
  const expectedToEvm20 = tron.tronHexToEvm20(depositHex21);

  const txid = invoice.client_tx_hash;
  const info = await tron.getTransactionInfo(solidity, txid);

  // If tx not found yet, skip
  if (!info || Object.keys(info).length === 0) return;

  const receiptResult = info?.receipt?.result;
  if (receiptResult && String(receiptResult).toUpperCase() !== 'SUCCESS') {
    await db.createReviewCase({
      kind: 'NEEDS_REVIEW',
      reasonCode: 'TX_FAILED',
      invoiceId: invoice.id,
      chainTxId: null,
      details: { txid, receiptResult },
    });
    await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
    await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'TX_FAILED' });
    return;
  }

  const parsed = parseTrc20TransferFromTxInfo(info, expectedToEvm20, usdtHex21);
  if (!parsed) {
    await db.createReviewCase({
      kind: 'NEEDS_REVIEW',
      reasonCode: 'TOKEN_OR_TO_MISMATCH',
      invoiceId: invoice.id,
      chainTxId: null,
      details: { txid },
    });
    await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
    await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'TOKEN_OR_TO_MISMATCH' });
    return;
  }

  const amountUsd = Number(parsed.amountRaw) / 1e6;

  // Normalize TRON addresses for storage/UI
  // to_address should match invoice.deposit_address (Base58)
  const fromBase58 = tron.tronEvm20ToBase58(parsed.fromEvm20);
  const toBase58 = invoice.deposit_address;

  if (invoice.expected_amount_usd !== null && invoice.expected_amount_usd !== undefined) {
    const exp = Number(invoice.expected_amount_usd);
    if (Math.abs(exp - amountUsd) > 1e-6) {
      await db.createReviewCase({
        kind: 'NEEDS_REVIEW',
        reasonCode: 'AMOUNT_MISMATCH',
        invoiceId: invoice.id,
        chainTxId: null,
        details: { txid, expected: exp, actual: amountUsd },
      });
      await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
      await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'AMOUNT_MISMATCH' });
      return;
    }
  }

  const blockNumber = info.blockNumber ?? null;
  const chainTx = await db.upsertChainTx({
    network: 'TRC20',
    tx_hash: txid,
    log_index: -1,
    event_id: '',
    token_contract: usdtBase58,
    from_address: fromBase58,
    to_address: toBase58,
    amount_raw: parsed.amountRaw.toString(),
    amount_usd: amountUsd,
    block_number: blockNumber,
    block_hash: null,
    status: 'DETECTED',
    confirmations: 0,
  });

  await db.linkInvoiceToChainTx(invoice.id, chainTx.id);

  await db.setInvoiceStatus(invoice.id, {
    status: 'DETECTED',
    detected_at: new Date().toISOString(),
    confirmations: 0,
  });

  await db.emitOutbox('deposit.detected', {
    invoiceId: invoice.id,
    network: 'TRC20',
    txHash: txid,
    amountUsd,
    blockNumber,
  });
}

async function processInvoiceConfirmAndCredit(invoice) {
  const chainTx = await db.getLinkedChainTx(invoice.id);
  if (!chainTx) return;

  const { solidity } = ensureTronRpc();

  // Current block number
  const currentBlock = await tron.getNowBlockNumber(solidity);

  const txBlock = Number(chainTx.block_number || 0);
  if (!txBlock) {
    // Some nodes may not include blockNumber quickly; retry later
    return;
  }

  const conf = Math.max(0, currentBlock - txBlock + 1);
  const required = Number(invoice.required_confirmations || cfg.confirmations.TRC20);

  const newStatus = conf >= required ? 'CONFIRMED' : 'CONFIRMING';

  await db.upsertChainTx({
    network: 'TRC20',
    tx_hash: chainTx.tx_hash,
    log_index: chainTx.log_index ?? -1,
    event_id: chainTx.event_id ?? '',
    token_contract: chainTx.token_contract,
    from_address: chainTx.from_address,
    to_address: chainTx.to_address,
    amount_raw: chainTx.amount_raw,
    amount_usd: chainTx.amount_usd,
    block_number: chainTx.block_number,
    block_hash: chainTx.block_hash,
    status: newStatus,
    confirmations: conf,
  });

  await db.setInvoiceStatus(invoice.id, {
    status: newStatus,
    confirmations: conf,
    confirmed_at: conf >= required ? new Date().toISOString() : invoice.confirmed_at,
  });

  await db.emitOutbox('deposit.confirmations', {
    invoiceId: invoice.id,
    network: 'TRC20',
    txHash: chainTx.tx_hash,
    confirmations: conf,
    requiredConfirmations: required,
  });

  if (newStatus !== 'CONFIRMED') return;

  if (!creditsEnabled()) {
    logger.warn('[gateway-tron] Credits disabled by CREDITS_ENABLED=false');
    return;
  }

  const credited = await db.creditInvoice({
    invoiceId: invoice.id,
    userId: invoice.user_id,
    chainTxId: chainTx.id,
    amountUsd: chainTx.amount_usd,
  });

  if (credited) {
    await db.emitOutbox('deposit.credited', {
      invoiceId: invoice.id,
      network: 'TRC20',
      txHash: chainTx.tx_hash,
      amountUsd: chainTx.amount_usd,
    });

    logger.info(`[gateway-tron] Credited invoice ${invoice.id} user ${invoice.user_id} amount ${chainTx.amount_usd} USD`);
  }
}

async function expireInvoiceIfNeeded(invoice) {
  if (!invoice.expires_at) return;
  const exp = new Date(invoice.expires_at).getTime();
  if (Number.isNaN(exp)) return;

  const now = Date.now();
  if (now > exp && ['WAITING', 'CREATED'].includes(invoice.status)) {
    await db.markInvoiceExpired(invoice.id);
    await db.emitOutbox('invoice.expired', { invoiceId: invoice.id, network: 'TRC20' });
  }
}

async function runOnce() {
  await db.ensureCheckpoint('TRC20');

  const invoices = await db.listInvoicesNeedingWork('TRC20', 200);

  for (const inv of invoices) {
    await expireInvoiceIfNeeded(inv);
    if (inv.status === 'EXPIRED' || inv.status === 'NEEDS_REVIEW' || inv.status === 'HOLD') continue;

    if (['WAITING', 'CREATED'].includes(inv.status) && inv.client_tx_hash) {
      await processInvoiceDetect(inv);
    }

    const inv2 = await db.getInvoiceById(inv.id);
    if (!inv2) continue;
    if (['DETECTED', 'CONFIRMING', 'CONFIRMED'].includes(inv2.status)) {
      await processInvoiceConfirmAndCredit(inv2);
    }
  }
}

async function start() {
  logger.info('[gateway-tron] worker started');
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      logger.error(`[gateway-tron] worker loop error: ${e.message}`, { stack: e.stack });
    }
    await sleep(cfg.worker.pollIntervalMs);
  }
}

if (require.main === module) {
  start();
}

module.exports = { runOnce, start };
