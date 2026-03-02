/**
 * ==========================================
 * ROYAL CASINO - ADMIN/CFO CONTROLLER
 * ==========================================
 * Handles dashboard analytics, withdrawal approvals, 
 * and ROOT-level system controls (Kill Switch).
 */

const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');
const { SYSTEM_FLAGS } = require('./paymentController');

/**
 * @route   GET /api/v1/admin/withdrawals/pending
 * @desc    Get all withdrawal requests waiting for CFO approval
 */
const getPendingWithdrawals = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*, users(username, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data: data || [],
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   PATCH /api/v1/admin/withdrawals/:id
 * @desc    Approve or Reject a withdrawal
 */
const processWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid note format' });
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status,
        processed_at: new Date().toISOString(),
        admin_note: note || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`CFO ${req.user?.id} ${status} withdrawal ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: `Withdrawal has been ${status} successfully.`,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/v1/admin/stats/rake
 * @desc    CFO dashboard stats: rake + withdrawals + deposits
 */
const getCasinoStats = async (req, res, next) => {
  try {
    const warnings = [];

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const todayISO = startOfDay.toISOString();

    const sumAmount = async (table, alias, builderFn) => {
      let q = supabase.from(table).select(`${alias}:amount.sum()`);
      if (builderFn) q = builderFn(q);

      const { data, error } = await q;
      if (error) throw error;

      const raw = Array.isArray(data) && data.length > 0 ? data[0][alias] : 0;
      return Number(raw ?? 0);
    };

    const countRows = async (table, builderFn) => {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      if (builderFn) q = builderFn(q);

      const { count, error } = await q;
      if (error) throw error;

      return Number(count ?? 0);
    };

    // ---------- RAKE ----------
    const totalRake = await sumAmount('rake_logs', 'totalRake');
    const todayRake = await sumAmount('rake_logs', 'todayRake', (q) => q.gte('created_at', todayISO));

    const totalRakeLogs = await countRows('rake_logs');
    const todayRakeLogs = await countRows('rake_logs', (q) => q.gte('created_at', todayISO));

    // ---------- WITHDRAWALS ----------
    const pendingWithdrawalsCount = await countRows('withdrawals', (q) => q.eq('status', 'pending'));
    const pendingWithdrawalsAmount = await sumAmount(
      'withdrawals',
      'pendingWithdrawalsAmount',
      (q) => q.eq('status', 'pending')
    );

    const approvedWithdrawalsTodayCount = await countRows('withdrawals', (q) =>
      q.eq('status', 'approved').gte('processed_at', todayISO)
    );

    const approvedWithdrawalsTodayAmount = await sumAmount(
      'withdrawals',
      'approvedWithdrawalsTodayAmount',
      (q) => q.eq('status', 'approved').gte('processed_at', todayISO)
    );

    // ---------- DEPOSITS ----------
    const depositStats = {
      available: false,
      table: null,
      currency: 'USDT',
      totalConfirmedAmount: 0,
      todayConfirmedAmount: 0,
      todayConfirmedCount: 0,
    };

    const tryDepositTable = async (tableName) => {
      const okStatuses = ['confirmed', 'finished', 'paid', 'completed'];

      const totalConfirmedAmount = await (async () => {
        let q = supabase.from(tableName).select('totalConfirmedAmount:amount.sum()').in('status', okStatuses);
        const { data, error } = await q;
        if (error) throw error;
        const raw = Array.isArray(data) && data.length > 0 ? data[0].totalConfirmedAmount : 0;
        return Number(raw ?? 0);
      })();

      const todayConfirmedAmount = await (async () => {
        let q = supabase
          .from(tableName)
          .select('todayConfirmedAmount:amount.sum()')
          .in('status', okStatuses)
          .gte('created_at', todayISO);

        const { data, error } = await q;
        if (error) throw error;
        const raw = Array.isArray(data) && data.length > 0 ? data[0].todayConfirmedAmount : 0;
        return Number(raw ?? 0);
      })();

      const todayConfirmedCount = await (async () => {
        let q = supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .in('status', okStatuses)
          .gte('created_at', todayISO);

        const { count, error } = await q;
        if (error) throw error;
        return Number(count ?? 0);
      })();

      return {
        available: true,
        table: tableName,
        currency: 'USDT',
        totalConfirmedAmount,
        todayConfirmedAmount,
        todayConfirmedCount,
      };
    };

    try {
      Object.assign(depositStats, await tryDepositTable('deposits'));
    } catch (e1) {
      try {
        Object.assign(depositStats, await tryDepositTable('payments'));
      } catch (e2) {
        warnings.push(
          'Deposit stats not available - deposits/payments table or expected columns/status values not found.'
        );
        logger.warn(`Deposit stats skipped: ${e2.message}`);
      }
    }

    // ---------- RESPONSE ----------
    return res.status(200).json({
      success: true,
      asOf: now.toISOString(),
      dayStart: todayISO,
      currency: 'CROWN',
      rake: {
        total: totalRake,
        today: todayRake,
        logs: {
          total: totalRakeLogs,
          today: todayRakeLogs,
        },
      },
      withdrawals: {
        pending: {
          count: pendingWithdrawalsCount,
          amount: pendingWithdrawalsAmount,
        },
        approvedToday: {
          count: approvedWithdrawalsTodayCount,
          amount: approvedWithdrawalsTodayAmount,
        },
      },
      deposits: depositStats,
      warnings,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/v1/admin/system/status
 * @desc    Get system-wide statuses (Publicly available for the frontend to check)
 */
const getSystemStatus = (req, res) => {
    return res.status(200).json({ 
        success: true, 
        withdrawalsActive: SYSTEM_FLAGS.isWithdrawalSystemActive 
    });
};

/**
 * @route   PATCH /api/v1/admin/system/withdrawals
 * @desc    ROOT ONLY: Toggle the entire withdrawal system on/off
 */
const toggleWithdrawalSystem = (req, res) => {
    if (req.user?.role !== 'root') {
        return res.status(403).json({ success: false, message: "Forbidden: ROOT access required." });
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: "isActive must be a boolean." });
    }

    SYSTEM_FLAGS.isWithdrawalSystemActive = isActive;
    
    logger.info(`ROOT action: Withdrawal system set to ${SYSTEM_FLAGS.isWithdrawalSystemActive ? 'ACTIVE' : 'DISABLED'}`);
    
    return res.status(200).json({ 
        success: true, 
        message: `Withdrawal system is now ${SYSTEM_FLAGS.isWithdrawalSystemActive ? 'ON' : 'OFF'}.`,
        withdrawalsActive: SYSTEM_FLAGS.isWithdrawalSystemActive
    });
};

module.exports = {
  getPendingWithdrawals,
  processWithdrawal,
  getCasinoStats,
  getSystemStatus,
  toggleWithdrawalSystem
};
