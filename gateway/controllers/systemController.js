/**
 * ==========================================
 * ROYAL - SYSTEM CONTROLLER
 * ==========================================
 */

const crypto = require('crypto');

let cached = null;
let cachedAt = 0;

function rsaPublicKeyBase64FromPrivate(privateKeyBase64) {
  if (!privateKeyBase64) return null;
  const privatePem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
  const pub = crypto.createPublicKey(privatePem);
  const pubPem = pub.export({ type: 'spki', format: 'pem' });
  return Buffer.from(pubPem, 'utf8').toString('base64');
}

async function getPublicConfig(req, res) {
  const now = Date.now();
  if (cached && now - cachedAt < 60_000) {
    return res.status(200).json({ success: true, data: cached });
  }

  const rsaPublicKeyBase64 = rsaPublicKeyBase64FromPrivate(process.env.RSA_PRIVATE_KEY_BASE64);

  cached = {
    rsaPublicKeyBase64,
    displayCurrency: process.env.BASE_CURRENCY || 'USD',
    withdrawalsActive: String(process.env.WITHDRAWALS_ACTIVE || 'false') === 'true',
    creditsEnabled: String(process.env.CREDITS_ENABLED || 'true') === 'true',
    gatewayMode: process.env.GATEWAY_MODE || 'sandbox_mainnet',
    supportedNetworks: String(process.env.GATEWAY_SUPPORTED_NETWORKS || 'ERC20,TRC20')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  cachedAt = now;

  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({ success: true, data: cached });
}

module.exports = {
  getPublicConfig,
};
