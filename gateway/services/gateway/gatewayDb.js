/**
 * ==========================================
 * ROYAL - GATEWAY DB ACCESS
 * ==========================================
 */

const supabase = require('../../config/supabaseClient');

async function insertInvoice({ userId, network, depositAddress, expectedAmountUsd, requiredConfirmations, expiresAt }) {
  const { data, error } = await supabase
    .from('gateway_invoices')
    .insert([
      {
        user_id: userId,
        network,
        deposit_address: depositAddress,
        expected_amount_usd: expectedAmountUsd ?? null,
        status: 'WAITING',
        required_confirmations: requiredConfirmations,
        confirmations: 0,
        expires_at: expiresAt,
      },
    ])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function getInvoiceById(invoiceId) {
  const { data, error } = await supabase
    .from('gateway_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listInvoicesNeedingWork(network, limit = 200) {
  const { data, error } = await supabase
    .from('gateway_invoices')
    .select('*')
    .eq('network', network)
    .in('status', ['WAITING', 'CREATED', 'DETECTED', 'CONFIRMING', 'CONFIRMED'])
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function setClientTxHash(invoiceId, clientTxHash) {
  const { data, error } = await supabase
    .from('gateway_invoices')
    .update({ client_tx_hash: clientTxHash })
    .eq('id', invoiceId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function markInvoiceExpired(invoiceId) {
  const { error } = await supabase
    .from('gateway_invoices')
    .update({ status: 'EXPIRED' })
    .eq('id', invoiceId);
  if (error) throw error;
}

async function setInvoiceStatus(invoiceId, fields) {
  const { data, error } = await supabase
    .from('gateway_invoices')
    .update(fields)
    .eq('id', invoiceId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function upsertChainTx(chainTx) {
  // chainTx: {network, tx_hash, log_index, event_id, token_contract, from_address, to_address, amount_raw, amount_usd, block_number, block_hash, status, confirmations}
  const { data, error } = await supabase
    .from('gateway_chain_transactions')
    .upsert([chainTx], { onConflict: 'network,tx_hash,log_index,event_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function linkInvoiceToChainTx(invoiceId, chainTxId) {
  const { data, error } = await supabase
    .from('gateway_invoice_tx_links')
    .upsert(
      [
        {
          invoice_id: invoiceId,
          chain_tx_id: chainTxId,
        },
      ],
      { onConflict: 'invoice_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function getLinkedChainTx(invoiceId) {
  const { data, error } = await supabase
    .from('gateway_invoice_tx_links')
    .select('chain_tx_id, gateway_chain_transactions(*)')
    .eq('invoice_id', invoiceId)
    .maybeSingle();
  if (error) throw error;
  return data?.gateway_chain_transactions || null;
}

async function createReviewCase({ kind, reasonCode, invoiceId, chainTxId, details }) {
  const { error } = await supabase
    .from('gateway_review_cases')
    .insert([
      {
        kind,
        reason_code: reasonCode,
        invoice_id: invoiceId ?? null,
        chain_tx_id: chainTxId ?? null,
        details: details ?? null,
      },
    ]);
  if (error) throw error;
}

async function emitOutbox(topic, payload) {
  const { error } = await supabase
    .from('gateway_outbox_events')
    .insert([
      {
        topic,
        payload,
        status: 'PENDING',
        attempts: 0,
        next_run_at: new Date().toISOString(),
      },
    ]);
  if (error) throw error;
}

async function creditInvoice({ invoiceId, userId, chainTxId, amountUsd }) {
  const { data, error } = await supabase.rpc('gateway_credit', {
    invoice_id: invoiceId,
    user_id: userId,
    chain_tx_id: chainTxId,
    amount_usd: amountUsd,
  });
  if (error) throw error;
  return data; // boolean
}

async function ensureCheckpoint(network) {
  const { data, error } = await supabase
    .from('gateway_worker_checkpoints')
    .upsert([{ network, last_processed_block: 0, last_finalized_block: 0 }], { onConflict: 'network' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function getCheckpoint(network) {
  const { data, error } = await supabase
    .from('gateway_worker_checkpoints')
    .select('*')
    .eq('network', network)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateCheckpoint(network, lastProcessed, lastFinalized) {
  const { error } = await supabase
    .from('gateway_worker_checkpoints')
    .update({
      last_processed_block: lastProcessed,
      last_finalized_block: lastFinalized,
      updated_at: new Date().toISOString(),
    })
    .eq('network', network);
  if (error) throw error;
}

module.exports = {
  insertInvoice,
  getInvoiceById,
  listInvoicesNeedingWork,
  setClientTxHash,
  markInvoiceExpired,
  setInvoiceStatus,
  upsertChainTx,
  linkInvoiceToChainTx,
  getLinkedChainTx,
  createReviewCase,
  emitOutbox,
  creditInvoice,
  ensureCheckpoint,
  getCheckpoint,
  updateCheckpoint,
};
