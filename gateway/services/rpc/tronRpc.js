/**
 * ==========================================
 * ROYAL - TRON HTTP API HELPERS
 * ==========================================
 * Works with public TRON full/solidity nodes.
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(str) {
  let num = 0n;
  for (const ch of str) {
    const p = BASE58_ALPHABET.indexOf(ch);
    if (p < 0) throw new Error('Invalid base58 character');
    num = num * 58n + BigInt(p);
  }

  // Convert to bytes
  let hex = num.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let bytes = Buffer.from(hex, 'hex');

  // Add leading zeros
  let leading = 0;
  for (const ch of str) {
    if (ch === '1') leading++;
    else break;
  }
  if (leading) {
    bytes = Buffer.concat([Buffer.alloc(leading), bytes]);
  }

  return bytes;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest();
}

function base58Encode(buf) {
  let num = 0n
  if (buf.length) {
    num = BigInt('0x' + buf.toString('hex'))
  }

  let out = ''
  while (num > 0n) {
    const rem = Number(num % 58n)
    out = BASE58_ALPHABET[rem] + out
    num = num / 58n
  }

  // Add leading zeros
  let leading = 0
  for (const b of buf) {
    if (b === 0) leading++
    else break
  }
  if (leading) out = '1'.repeat(leading) + out
  return out || '1'
}

function tronBase58ToHex(addressBase58) {
  const raw = base58Decode(addressBase58);
  if (raw.length < 5) throw new Error('Invalid TRON address');
  const payload = raw.slice(0, -4);
  const checksum = raw.slice(-4);
  const hash = sha256(sha256(payload));
  const expected = hash.slice(0, 4);
  if (!expected.equals(checksum)) throw new Error('Invalid TRON address checksum');
  return payload.toString('hex'); // 21 bytes: 41 + 20 bytes
}

function tronHexToBase58(hex21) {
  const h = String(hex21 || '').toLowerCase().replace(/^0x/, '')
  const payload = Buffer.from(h, 'hex')
  if (payload.length != 21) throw new Error('Invalid TRON hex address (expected 21 bytes)')
  const checksum = sha256(sha256(payload)).slice(0, 4)
  const raw = Buffer.concat([payload, checksum])
  return base58Encode(raw)
}

function tronEvm20ToHex21(evm20) {
  const h = String(evm20 || '').toLowerCase().replace(/^0x/, '')
  if (h.length !== 40) throw new Error('Expected 20-byte EVM address (40 hex chars)')
  return '41' + h
}

function tronEvm20ToBase58(evm20) {
  return tronHexToBase58(tronEvm20ToHex21(evm20))
}

function tronHexToEvm20(hex21) {
  const h = hex21.toLowerCase().replace(/^0x/, '');
  if (h.length !== 42) throw new Error('Expected 21-byte hex for TRON (42 hex chars)');
  // Strip the 0x41 prefix (1 byte) to get 20-byte EVM address
  return h.slice(2);
}

async function tronPost(baseUrl, path, body, timeoutMs = 15_000) {
  const url = baseUrl.replace(/\/$/, '') + path;
  const res = await axios.post(url, body, { timeout: timeoutMs });
  return res.data;
}

async function getNowBlockNumber(baseUrlSolidity) {
  const data = await tronPost(baseUrlSolidity, '/walletsolidity/getnowblock', {});
  const num = data?.block_header?.raw_data?.number;
  if (typeof num !== 'number') throw new Error('TRON getnowblock: missing block number');
  return num;
}

async function getTransactionInfo(baseUrlSolidity, txid) {
  // solidity is safer for confirmed data
  const data = await tronPost(baseUrlSolidity, '/walletsolidity/gettransactioninfobyid', { value: txid }, 20_000);
  return data;
}

module.exports = {
  tronBase58ToHex,
  tronHexToBase58,
  tronHexToEvm20,
  tronEvm20ToHex21,
  tronEvm20ToBase58,
  tronPost,
  getNowBlockNumber,
  getTransactionInfo,
};
