const { createClient } = require("@supabase/supabase-js");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function createSupabaseServiceClient() {
  const url = mustEnv("SUPABASE_URL");
  const key = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getFlags() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("system_flags").select("key,bool_value,text_value");
  if (error) throw error;

  const out = {};
  for (const row of data || []) {
    out[row.key] = row.bool_value !== null ? row.bool_value : row.text_value;
  }
  return out;
}

async function getHeartbeats() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("system_heartbeats").select("component,status,last_seen_at,last_error,meta");
  if (error) throw error;
  return data || [];
}

function computeOnline(heartbeats, { maxAgeSec = 120 } = {}) {
  const now = Date.now();
  const by = Object.fromEntries(heartbeats.map(h => [h.component, h]));

  const check = (comp) => {
    const row = by[comp];
    if (!row) return { ok: false, ageSec: null, status: "MISSING" };
    const ageSec = Math.floor((now - new Date(row.last_seen_at).getTime()) / 1000);
    const ok = ageSec <= maxAgeSec && (row.status === "OK" || row.status === "DEGRADED");
    return { ok, ageSec, status: row.status, lastError: row.last_error || null };
  };

  const api = check("api");
  const erc20 = check("worker_erc20");
  const trc20 = check("worker_trc20");

  const systemOnline = api.ok;
  return { systemOnline, api, erc20, trc20 };
}

module.exports = { getFlags, getHeartbeats, computeOnline };
