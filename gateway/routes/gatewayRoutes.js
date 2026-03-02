/**
 * ==========================================
 * ROYAL - GATEWAY ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();

const gatewayController = require('../controllers/gatewayController');
const { protectRoute } = require('../utils/jwtSecurity');

router.use(protectRoute);

router.post('/invoices', gatewayController.createInvoice);
router.get('/invoices/:id', gatewayController.getInvoice);
router.get('/invoices/:id/status', gatewayController.getInvoiceStatus);
router.post('/invoices/:id/client-tx', gatewayController.attachClientTx);

module.exports = router;
