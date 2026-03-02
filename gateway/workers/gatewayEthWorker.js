/**
 * ==========================================
 * ROYAL - GATEWAY ETH WORKER (ERC20)
 * ==========================================
 * Responsibilities:
 * - Detect deposits for invoices
 * - Track confirmations
 * - Credit user (USD 1:1) when confirmed
 * - Emit outbox events
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
const evm = require('../services/rpc/evmJsonRpc');

const TRANSFER_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function creditsEnabled() {
  return String(process.env.CREDITS_ENABLED || 'true') === 'true';
}

async function withRpcFallback(fn) {
  const urls = [cfg.rpc.eth.http1, cfg.rpc.eth.http2].filter(Boolean);
  let lastErr = null;
  for (const u of urls) {
    try {
      return await fn(u);
    } catch (e) {
      lastErr = e;
      logger.warn(`[gateway-eth] RPC failed (${u}): ${e.message}`);
    }
  }
  throw lastErr || new Error('No ETH RPC configured');
}

function parseTransferFromReceipt(receipt, usdtContractLower) {
  if (!receipt || !Array.isArray(receipt.logs)) return null;

  for (const log of receipt.logs) {
    const addr = (log.address || '').toLowerCase();
    if (addr !== usdtContractLower) continue;

    const topics = log.topics || [];
    if (topics.length < 3) continue;
    if ((topics[0] || '').toLowerCase() !== TRANSFER_SIG) continue;

    const from = '0x' + topics[1].slice(-40);
    const to = '0x' + topics[2].slice(-40);

    const amountRaw = BigInt(log.data);
    const logIndex = parseInt(log.logIndex, 16);

    return { from: from.toLowerCase(), to: to.toLowerCase(), amountRaw, logIndex };
  }

  return null;
}

async function processInvoiceDetect(invoice) {
  if (!invoice.client_tx_hash) return;

  const usdt = (cfg.usdtContracts.ERC20 || '').toLowerCase();
  if (!usdt) throw new Error('Missing USDT_CONTRACT_ERC20');

  const txHash = invoice.client_tx_hash;

  const receipt = await withRpcFallback((url) => evm.getTransactionReceipt(url, txHash));
  if (!receipt) return; // not mined yet

  if (String(receipt.status).toLowerCase() !== '0x1') {
    await db.createReviewCase({
      kind: 'NEEDS_REVIEW',
      reasonCode: 'TX_FAILED',
      invoiceId: invoice.id,
      chainTxId: null,
      details: { txHash },
    });

    await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
    await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'TX_FAILED' });
    return;
  }

  const parsed = parseTransferFromReceipt(receipt, usdt);
  if (!parsed) {
    await db.createReviewCase({
      kind: 'NEEDS_REVIEW',
      reasonCode: 'TOKEN_MISMATCH',
      invoiceId: invoice.id,
      chainTxId: null,
      details: { txHash },
    });
    await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
    await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'TOKEN_MISMATCH' });
    return;
  }

  const toExpected = String(invoice.deposit_address || '').toLowerCase();
  if (parsed.to !== toExpected) {
    await db.createReviewCase({
      kind: 'NEEDS_REVIEW',
      reasonCode: 'ADDRESS_NOT_MATCHED',
      invoiceId: invoice.id,
      chainTxId: null,
      details: { txHash, expectedTo: toExpected, actualTo: parsed.to },
    });
    await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
    await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'ADDRESS_NOT_MATCHED' });
    return;
  }

  const amountUsd = Number(parsed.amountRaw) / 1e6;

  // Amount policy
  if (invoice.expected_amount_usd !== null && invoice.expected_amount_usd !== undefined) {
    const exp = Number(invoice.expected_amount_usd);
    if (Math.abs(exp - amountUsd) > 1e-6) {
      await db.createReviewCase({
        kind: 'NEEDS_REVIEW',
        reasonCode: 'AMOUNT_MISMATCH',
        invoiceId: invoice.id,
        chainTxId: null,
        details: { txHash, expected: exp, actual: amountUsd },
      });
      await db.setInvoiceStatus(invoice.id, { status: 'NEEDS_REVIEW' });
      await db.emitOutbox('deposit.needs_review', { invoiceId: invoice.id, reason: 'AMOUNT_MISMATCH' });
      return;
    }
  }

  const chainTx = await db.upsertChainTx({
    network: 'ERC20',
    tx_hash: txHash,
    log_index: parsed.logIndex,
    event_id: '',
    token_contract: usdt,
    from_address: parsed.from,
    to_address: parsed.to,
    amount_raw: parsed.amountRaw.toString(),
    amount_usd: amountUsd,
    block_number: parseInt(receipt.blockNumber, 16),
    block_hash: receipt.blockHash,
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
    network: 'ERC20',
    txHash,
    amountUsd,
    blockNumber: chainTx.block_number,
  });
}

async function processInvoiceConfirmAndCredit(invoice) {
  const chainTx = await db.getLinkedChainTx(invoice.id);
  if (!chainTx) return;

  // Get current block
  const currentBlock = await withRpcFallback((url) => evm.getBlockNumber(url));

  const txBlock = Number(chainTx.block_number || 0);
  if (!txBlock) return;

  const conf = Math.max(0, currentBlock - txBlock + 1);

  const required = Number(invoice.required_confirmations || cfg.confirmations.ERC20);

  const newStatus = conf >= required ? 'CONFIRMED' : 'CONFIRMING';

  await db.upsertChainTx({
    network: 'ERC20',
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
    network: 'ERC20',
    txHash: chainTx.tx_hash,
    confirmations: conf,
    requiredConfirmations: required,
  });

  if (newStatus !== 'CONFIRMED') return;

  if (!creditsEnabled()) {
    logger.warn('[gateway-eth] Credits disabled by CREDITS_ENABLED=false');
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
      network: 'ERC20',
      txHash: chainTx.tx_hash,
      amountUsd: chainTx.amount_usd,
    });

    logger.info(`[gateway-eth] Credited invoice ${invoice.id} user ${invoice.user_id} amount ${chainTx.amount_usd} USD`);
  }
}

async function expireInvoiceIfNeeded(invoice) {
  if (!invoice.expires_at) return;
  const exp = new Date(invoice.expires_at).getTime();
  if (Number.isNaN(exp)) return;

  const now = Date.now();
  if (now > exp && ['WAITING', 'CREATED'].includes(invoice.status)) {
    await db.markInvoiceExpired(invoice.id);
    await db.emitOutbox('invoice.expired', { invoiceId: invoice.id, network: 'ERC20' });
  }
}

async function runOnce() {
  await db.ensureCheckpoint('ERC20');

  const invoices = await db.listInvoicesNeedingWork('ERC20', 200);

  for (const inv of invoices) {
    await expireInvoiceIfNeeded(inv);
    if (inv.status === 'EXPIRED' || inv.status === 'NEEDS_REVIEW' || inv.status === 'HOLD') continue;

    if (['WAITING', 'CREATED'].includes(inv.status) && inv.client_tx_hash) {
      await processInvoiceDetect(inv);
    }

    // refresh invoice after detection
    const inv2 = await db.getInvoiceById(inv.id);
    if (!inv2) continue;
    if (['DETECTED', 'CONFIRMING', 'CONFIRMED'].includes(inv2.status)) {
      await processInvoiceConfirmAndCredit(inv2);
    }
  }
}

async function start() {
  logger.info('[gateway-eth] worker started');
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      logger.error(`[gateway-eth] worker loop error: ${e.message}`, { stack: e.stack });
    }

    await sleep(cfg.worker.pollIntervalMs);
  }
}

if (require.main === module) {
  start();
}

module.exports = { runOnce, start };
