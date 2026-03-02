/**
 * ==========================================
 * ROYAL - GATEWAY OUTBOX PUBLISHER
 * ==========================================
 * Minimal publisher that marks events as SENT.
 * You can extend to push to WebSocket, Slack, Webhooks, etc.
 */

// Load env for worker process (supports DOTENV_PATH override)
const path = require('path');
const dotenv = require('dotenv');
const dotenvPath = process.env.DOTENV_PATH
  ? path.resolve(process.env.DOTENV_PATH)
  : path.resolve(process.cwd(), '.env');
dotenv.config({ path: dotenvPath, override: false });

const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runOnce(limit = 100) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('gateway_outbox_events')
    .select('*')
    .eq('status', 'PENDING')
    .lte('next_run_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  const events = data || [];

  for (const ev of events) {
    // For now: just mark sent.
    const { error: updErr } = await supabase
      .from('gateway_outbox_events')
      .update({ status: 'SENT', updated_at: new Date().toISOString() })
      .eq('id', ev.id);

    if (updErr) {
      logger.error(`[outbox] failed to mark SENT: ${updErr.message}`);
      await supabase
        .from('gateway_outbox_events')
        .update({
          attempts: (ev.attempts || 0) + 1,
          last_error: updErr.message,
          next_run_at: new Date(Date.now() + 5_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ev.id);
    }
  }

  return events.length;
}

async function start() {
  const interval = Number(process.env.OUTBOX_PUBLISH_INTERVAL_MS || 500);
  logger.info('[outbox] publisher started');

  while (true) {
    try {
      const n = await runOnce(200);
      if (n > 0) logger.info(`[outbox] published ${n} events`);
    } catch (e) {
      logger.error(`[outbox] loop error: ${e.message}`, { stack: e.stack });
    }
    await sleep(interval);
  }
}

if (require.main === module) {
  start();
}

module.exports = { runOnce, start };
