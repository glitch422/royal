/**
 * ==========================================
 * ROYAL - EVM JSON-RPC HELPERS (ETH)
 * ==========================================
 */

const axios = require('axios');

async function rpcCall(rpcUrl, method, params = [], timeoutMs = 15_000) {
  const res = await axios.post(
    rpcUrl,
    {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    },
    { timeout: timeoutMs }
  );

  if (res.data && res.data.error) {
    const msg = res.data.error.message || JSON.stringify(res.data.error);
    throw new Error(`RPC error (${method}): ${msg}`);
  }

  return res.data.result;
}

async function getBlockNumber(rpcUrl) {
  const hex = await rpcCall(rpcUrl, 'eth_blockNumber');
  return parseInt(hex, 16);
}

async function getTransactionReceipt(rpcUrl, txHash) {
  return rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash]);
}

async function getLogs(rpcUrl, filter) {
  return rpcCall(rpcUrl, 'eth_getLogs', [filter], 30_000);
}

function normalizeHexAddress(addr) {
  if (!addr) return '';
  const a = String(addr).trim();
  if (!a) return '';
  return a.toLowerCase();
}

function padTopicAddress(address) {
  // address is 0x + 40 hex
  const a = normalizeHexAddress(address).replace(/^0x/, '');
  return '0x' + a.padStart(64, '0');
}

module.exports = {
  rpcCall,
  getBlockNumber,
  getTransactionReceipt,
  getLogs,
  normalizeHexAddress,
  padTopicAddress,
};
