/**
 * ==========================================
 * ROYAL - SYSTEM ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();

const systemController = require('../controllers/systemController');

router.get('/public-config', systemController.getPublicConfig);

module.exports = router;
