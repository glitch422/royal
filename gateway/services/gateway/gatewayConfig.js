/**
 * ==========================================
 * ROYAL - GATEWAY CONFIG
 * ==========================================
 */

const mustGetEnv = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env var: ${k}`);
  return v;
};

const boolEnv = (k, def = false) => {
  const v = process.env[k];
  if (v === undefined) return def;
  return String(v).toLowerCase() === 'true';
};

const numEnv = (k, def) => {
  const v = process.env[k];
  if (v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const GATEWAY_MODE = (process.env.GATEWAY_MODE || 'sandbox_mainnet').trim();

const SUPPORTED_NETWORKS = String(process.env.GATEWAY_SUPPORTED_NETWORKS || 'ERC20,TRC20')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const invoiceTtlSeconds = numEnv('INVOICE_TTL_SECONDS', 1800);

const confirmations = {
  ERC20: numEnv('CONFIRMATIONS_ERC20', 12),
  TRC20: numEnv('CONFIRMATIONS_TRC20', 20),
};

const treasury = {
  ERC20: process.env.TREASURY_ADDRESS_ERC20 || '',
  TRC20: process.env.TREASURY_ADDRESS_TRC20 || '',
};

const usdtContracts = {
  ERC20: (process.env.USDT_CONTRACT_ERC20 || '').trim(),
  TRC20: (process.env.USDT_CONTRACT_TRC20 || '').trim(),
};

const rpc = {
  eth: {
    http1: process.env.ETH_RPC_HTTP_1 || '',
    http2: process.env.ETH_RPC_HTTP_2 || '',
    ws1: process.env.ETH_RPC_WS_1 || '',
  },
  tron: {
    http1: process.env.TRON_RPC_HTTP_1 || '',
    http2: process.env.TRON_RPC_HTTP_2 || '',
  },
};

const worker = {
  pollIntervalMs: numEnv('WORKER_POLL_INTERVAL_MS', 1500),
  batchSize: numEnv('WORKER_BATCH_SIZE', 2000),
  concurrency: numEnv('WORKER_CONCURRENCY', 2),
  reorgLookbackBlocks: numEnv('REORG_LOOKBACK_BLOCKS', 40),
  dailyBackfillBlocks: numEnv('DAILY_BACKFILL_BLOCKS', 5000),
  crossValidateSampleRate: numEnv('CROSS_VALIDATE_SAMPLE_RATE', 0.02),
  anchorRetentionDays: numEnv('ANCHOR_RETENTION_DAYS', 60),
};

module.exports = {
  mustGetEnv,
  boolEnv,
  numEnv,
  GATEWAY_MODE,
  SUPPORTED_NETWORKS,
  invoiceTtlSeconds,
  confirmations,
  treasury,
  usdtContracts,
  rpc,
  worker,
};
