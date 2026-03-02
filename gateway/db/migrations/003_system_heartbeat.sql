BEGIN;

-- =========================================================
-- ROYAL - SYSTEM HEALTH + HEARTBEATS
-- =========================================================
-- Goal:
-- 1) Detect when API/workers stop and drive UI banners.
-- 2) Keep DB active via periodic writes (heartbeat).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.system_heartbeats (
  component TEXT PRIMARY KEY,                               -- 'api', 'worker_erc20', 'worker_trc20'
  status TEXT NOT NULL DEFAULT 'OK',                         -- 'OK' | 'DEGRADED' | 'DOWN'
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_flags (
  key TEXT PRIMARY KEY,                                     -- 'deposits_enabled', 'withdrawals_enabled'
  bool_value BOOLEAN NULL,
  text_value TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_heartbeats_updated_at ON public.system_heartbeats;
CREATE TRIGGER trg_system_heartbeats_updated_at
BEFORE UPDATE ON public.system_heartbeats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_system_flags_updated_at ON public.system_flags;
CREATE TRIGGER trg_system_flags_updated_at
BEFORE UPDATE ON public.system_flags
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

INSERT INTO public.system_flags (key, bool_value)
VALUES
  ('deposits_enabled', TRUE),
  ('withdrawals_enabled', TRUE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_flags (key, text_value)
VALUES
  ('maintenance_banner', NULL)
ON CONFLICT (key) DO NOTHING;

COMMIT;
