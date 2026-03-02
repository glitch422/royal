/**
 * ==========================================
 * ROYAL - GATEWAY SERVICE
 * ==========================================
 */

const logger = require('../../utils/logger');
const cfg = require('./gatewayConfig');
const db = require('./gatewayDb');

function normalizeNetwork(n) {
  if (!n) return '';
  const up = String(n).trim().toUpperCase();
  if (up === 'ETH' || up === 'ETHEREUM') return 'ERC20';
  if (up === 'TRON') return 'TRC20';
  return up;
}

function nowPlusSeconds(sec) {
  return new Date(Date.now() + sec * 1000).toISOString();
}

function parseAmount(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid amount');
  // keep 6 decimals max
  return Math.round(n * 1e6) / 1e6;
}

async function createInvoice({ userId, network, expectedAmountUsd }) {
  const net = normalizeNetwork(network);
  if (!cfg.SUPPORTED_NETWORKS.includes(net)) {
    const err = new Error('Unsupported network');
    err.statusCode = 400;
    throw err;
  }

  const expected = parseAmount(expectedAmountUsd);

  const expiresAt = nowPlusSeconds(cfg.invoiceTtlSeconds);
  const requiredConfirmations = cfg.confirmations[net] ?? 0;

  let depositAddress = '';
  if (cfg.GATEWAY_MODE === 'sandbox_mainnet') {
    depositAddress = cfg.treasury[net];
    if (!depositAddress) {
      const err = new Error(`Missing treasury address for ${net}`);
      err.statusCode = 500;
      throw err;
    }
  } else {
    // Production address allocation (Phase 2)
    // For now we fallback to treasury (you can swap to HD derivation later).
    depositAddress = cfg.treasury[net];
    if (!depositAddress) {
      const err = new Error(`Missing treasury address for ${net}`);
      err.statusCode = 500;
      throw err;
    }
  }

  const invoice = await db.insertInvoice({
    userId,
    network: net,
    depositAddress,
    expectedAmountUsd: expected,
    requiredConfirmations,
    expiresAt,
  });

  await db.emitOutbox('deposit.created', {
    invoiceId: invoice.id,
    userId,
    network: net,
    depositAddress,
    expectedAmountUsd: expected,
    requiredConfirmations,
    expiresAt,
  });

  return {
    invoiceId: invoice.id,
    network: invoice.network,
    depositAddress: invoice.deposit_address,
    expectedAmountUsd: invoice.expected_amount_usd,
    status: invoice.status,
    requiredConfirmations: invoice.required_confirmations,
    confirmations: invoice.confirmations,
    tokenContract: cfg.usdtContracts[net],
    tokenDecimals: 6,
    expiresAt: invoice.expires_at,
    mode: cfg.GATEWAY_MODE,
  };
}

async function getInvoiceForUser({ invoiceId, userId, role }) {
  const invoice = await db.getInvoiceById(invoiceId);
  if (!invoice) return null;

  const isPriv = role === 'admin' || role === 'root';
  if (!isPriv && invoice.user_id !== userId) return null;

  return invoice;
}

async function getInvoiceStatusForUser({ invoiceId, userId, role }) {
  const invoice = await getInvoiceForUser({ invoiceId, userId, role });
  if (!invoice) return null;

  const chainTx = await db.getLinkedChainTx(invoiceId);

  return {
    invoiceId: invoice.id,
    network: invoice.network,
    depositAddress: invoice.deposit_address,
    status: invoice.status,
    requiredConfirmations: invoice.required_confirmations,
    confirmations: invoice.confirmations,
    clientTxHash: invoice.client_tx_hash,
    expectedAmountUsd: invoice.expected_amount_usd,
    receivedAmountUsd: invoice.received_amount_usd,
    expiresAt: invoice.expires_at,
    detectedAt: invoice.detected_at,
    confirmedAt: invoice.confirmed_at,
    creditedAt: invoice.credited_at,
    chain: chainTx
      ? {
          txHash: chainTx.tx_hash,
          tokenContract: chainTx.token_contract,
          from: chainTx.from_address,
          to: chainTx.to_address,
          amountUsd: chainTx.amount_usd,
          blockNumber: chainTx.block_number,
          status: chainTx.status,
          confirmations: chainTx.confirmations,
          logIndex: chainTx.log_index,
          eventId: chainTx.event_id,
        }
      : null,
  };
}

async function attachClientTx({ invoiceId, userId, role, txHash, network }) {
  if (!txHash || typeof txHash !== 'string') {
    const err = new Error('txHash is required');
    err.statusCode = 400;
    throw err;
  }
  const net = normalizeNetwork(network);
  const invoice = await getInvoiceForUser({ invoiceId, userId, role });
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }
  if (net && net !== invoice.network) {
    const err = new Error('Network mismatch');
    err.statusCode = 400;
    throw err;
  }

  const updated = await db.setClientTxHash(invoiceId, txHash.trim());

  await db.emitOutbox('deposit.client_tx_attached', {
    invoiceId,
    network: invoice.network,
    txHash: txHash.trim(),
  });

  return {
    invoiceId: updated.id,
    network: updated.network,
    clientTxHash: updated.client_tx_hash,
    status: updated.status,
  };
}

module.exports = {
  createInvoice,
  getInvoiceForUser,
  getInvoiceStatusForUser,
  attachClientTx,
};
