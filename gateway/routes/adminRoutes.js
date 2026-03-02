/**
 * ==========================================
 * ROYAL CASINO - ADMIN ROUTES
 * ==========================================
 * Routes for CFO analytics, withdrawal processing, 
 * and ROOT-level system controls.
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { protectRoute } = require('../utils/jwtSecurity');
const { isAdmin } = require('../middleware/adminMiddleware');

// 1. Public Admin Routes (Checking system status for the frontend UI)
// Placed before the auth middleware so the frontend can check it freely
router.get('/system/status', adminController.getSystemStatus);

// ==========================================
// ALL ROUTES BELOW REQUIRE AUTH & ADMIN ROLE
// ==========================================
router.use(protectRoute);
router.use(isAdmin);

// 2. ROOT Level System Controls
router.patch('/system/withdrawals', adminController.toggleWithdrawalSystem);

// 3. Withdrawal Management (CFO/Admin)
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.patch('/withdrawals/:id', adminController.processWithdrawal);

// 4. Financial Analytics (CFO/Admin)
router.get('/stats/rake', adminController.getCasinoStats);

module.exports = router;
