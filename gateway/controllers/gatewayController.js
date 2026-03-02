/**
 * ==========================================
 * ROYAL - GATEWAY CONTROLLER
 * ==========================================
 * Internal gateway (ERC20/TRC20) invoices + status + client tx hints.
 */

const logger = require('../utils/logger');
const gatewayService = require('../services/gateway/gatewayService');

// POST /api/v1/gateway/invoices
async function createInvoice(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { network, amountUsd } = req.body || {};

    const invoice = await gatewayService.createInvoice({
      userId,
      network,
      expectedAmountUsd: amountUsd,
    });

    return res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/gateway/invoices/:id
async function getInvoice(req, res, next) {
  try {
    const invoiceId = req.params.id;
    const userId = req.user?.id;

    const invoice = await gatewayService.getInvoiceForUser({ invoiceId, userId, role: req.user?.role });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    return res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/gateway/invoices/:id/status
async function getInvoiceStatus(req, res, next) {
  try {
    const invoiceId = req.params.id;
    const userId = req.user?.id;

    const status = await gatewayService.getInvoiceStatusForUser({ invoiceId, userId, role: req.user?.role });
    if (!status) return res.status(404).json({ success: false, message: 'Invoice not found' });

    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/gateway/invoices/:id/client-tx
async function attachClientTx(req, res, next) {
  try {
    const invoiceId = req.params.id;
    const userId = req.user?.id;
    const { txHash, network } = req.body || {};

    const updated = await gatewayService.attachClientTx({ invoiceId, userId, role: req.user?.role, txHash, network });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createInvoice,
  getInvoice,
  getInvoiceStatus,
  attachClientTx,
};
