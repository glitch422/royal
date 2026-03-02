/**
 * ==========================================
 * ROYAL CASINO - FAIRNESS ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();
const fairnessController = require('../controllers/fairnessController');

// Verification endpoint
router.post('/verify', fairnessController.verifyHand);

module.exports = router;
