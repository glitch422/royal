-- ==========================================
-- ROYAL - GATEWAY TABLES (ERC20 + TRC20)
-- ==========================================
-- Idempotent migration: safe to run multiple times.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Worker checkpoints (per network) ----------
CREATE TABLE IF NOT EXISTS public.gateway_worker_checkpoints (
  network TEXT PRIMARY KEY CHECK (network IN ('ERC20','TRC20')),
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  last_finalized_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Block anchors (Phase 2) ----------
CREATE TABLE IF NOT EXISTS public.gateway_block_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('ERC20','TRC20')),
  block_number BIGINT NOT NULL,
  block_hash TEXT NOT NULL,
  parent_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(network, block_number)
);

-- ---------- Invoices ----------
CREATE TABLE IF NOT EXISTS public.gateway_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('ERC20','TRC20')),
  deposit_address TEXT NOT NULL,
  expected_amount_usd NUMERIC(18,6) NULL,
  received_amount_usd NUMERIC(18,6) NULL,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (
    status IN (
      'CREATED','WAITING','DETECTED','CONFIRMING','CONFIRMED','CREDITED',
      'EXPIRED','FAILED','NEEDS_REVIEW','HOLD','DUST'
    )
  ),
  required_confirmations INT NOT NULL DEFAULT 0,
  confirmations INT NOT NULL DEFAULT 0,
  client_tx_hash TEXT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ NULL,
  confirmed_at TIMESTAMPTZ NULL,
  credited_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Safety: unique deposit address per network (Phase 2)
);

CREATE INDEX IF NOT EXISTS idx_gateway_invoices_user ON public.gateway_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_invoices_status ON public.gateway_invoices(status);
CREATE INDEX IF NOT EXISTS idx_gateway_invoices_expires ON public.gateway_invoices(expires_at);
CREATE INDEX IF NOT EXISTS idx_gateway_invoices_client_tx ON public.gateway_invoices(client_tx_hash);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.gateway_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gateway_invoices_updated_at ON public.gateway_invoices;
CREATE TRIGGER trg_gateway_invoices_updated_at
BEFORE UPDATE ON public.gateway_invoices
FOR EACH ROW EXECUTE FUNCTION public.gateway_set_updated_at();

-- ---------- Chain transactions (normalized) ----------
CREATE TABLE IF NOT EXISTS public.gateway_chain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('ERC20','TRC20')),
  tx_hash TEXT NOT NULL,
  log_index INT NOT NULL DEFAULT -1,
  event_id TEXT NOT NULL DEFAULT '',
  token_contract TEXT NOT NULL,
  from_address TEXT NULL,
  to_address TEXT NULL,
  amount_raw NUMERIC(78,0) NOT NULL DEFAULT 0,
  amount_usd NUMERIC(18,6) NOT NULL DEFAULT 0,
  block_number BIGINT NULL,
  block_hash TEXT NULL,
  status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN ('DETECTED','CONFIRMING','CONFIRMED','FAILED')),
  confirmations INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup: event-level uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_gateway_chain_event
ON public.gateway_chain_transactions (network, tx_hash, log_index, event_id);

CREATE INDEX IF NOT EXISTS idx_gateway_chain_status ON public.gateway_chain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_gateway_chain_block ON public.gateway_chain_transactions(network, block_number);

DROP TRIGGER IF EXISTS trg_gateway_chain_updated_at ON public.gateway_chain_transactions;
CREATE TRIGGER trg_gateway_chain_updated_at
BEFORE UPDATE ON public.gateway_chain_transactions
FOR EACH ROW EXECUTE FUNCTION public.gateway_set_updated_at();

-- ---------- Invoice <-> ChainTx link ----------
CREATE TABLE IF NOT EXISTS public.gateway_invoice_tx_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.gateway_invoices(id) ON DELETE CASCADE,
  chain_tx_id UUID NOT NULL REFERENCES public.gateway_chain_transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invoice_id),
  UNIQUE(chain_tx_id)
);

-- ---------- Credits idempotency ----------
CREATE TABLE IF NOT EXISTS public.gateway_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.gateway_invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chain_tx_id UUID NOT NULL REFERENCES public.gateway_chain_transactions(id) ON DELETE CASCADE,
  amount_usd NUMERIC(18,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invoice_id),
  UNIQUE(chain_tx_id)
);

-- Atomic credit function (idempotent)
CREATE OR REPLACE FUNCTION public.gateway_credit(invoice_id UUID, user_id UUID, chain_tx_id UUID, amount_usd NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  inserted INT;
BEGIN
  INSERT INTO public.gateway_credits (invoice_id, user_id, chain_tx_id, amount_usd)
  VALUES (invoice_id, user_id, chain_tx_id, amount_usd)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted = 1 THEN
    -- Credit user
    UPDATE public.users
    SET balance = balance + amount_usd
    WHERE id = user_id;

    -- Update invoice status
    UPDATE public.gateway_invoices
    SET status='CREDITED', credited_at=now(), received_amount_usd=amount_usd
    WHERE id = invoice_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- Review cases (Needs Review / Compliance) ----------
CREATE TABLE IF NOT EXISTS public.gateway_review_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('NEEDS_REVIEW','COMPLIANCE')),
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','REJECTED')),
  invoice_id UUID NULL REFERENCES public.gateway_invoices(id) ON DELETE SET NULL,
  chain_tx_id UUID NULL REFERENCES public.gateway_chain_transactions(id) ON DELETE SET NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_cases_status ON public.gateway_review_cases(status);

DROP TRIGGER IF EXISTS trg_gateway_cases_updated_at ON public.gateway_review_cases;
CREATE TRIGGER trg_gateway_cases_updated_at
BEFORE UPDATE ON public.gateway_review_cases
FOR EACH ROW EXECUTE FUNCTION public.gateway_set_updated_at();

-- ---------- Outbox events ----------
CREATE TABLE IF NOT EXISTS public.gateway_outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
  attempts INT NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_outbox_pending
ON public.gateway_outbox_events(status, next_run_at);

DROP TRIGGER IF EXISTS trg_gateway_outbox_updated_at ON public.gateway_outbox_events;
CREATE TRIGGER trg_gateway_outbox_updated_at
BEFORE UPDATE ON public.gateway_outbox_events
FOR EACH ROW EXECUTE FUNCTION public.gateway_set_updated_at();

COMMIT;
