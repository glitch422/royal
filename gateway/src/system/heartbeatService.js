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

async function beat({ component, status = "OK", lastError = null, meta = {} }) {
  const supabase = createSupabaseServiceClient();
  const payload = {
    component,
    status,
    last_seen_at: new Date().toISOString(),
    last_error: lastError,
    meta,
  };

  const { error } = await supabase.from("system_heartbeats").upsert(payload, { onConflict: "component" });
  if (error) throw error;
}

async function dbPing() {
  const supabase = createSupabaseServiceClient();
  const start = Date.now();
  const { error } = await supabase.from("system_flags").select("key").limit(1);
  const ms = Date.now() - start;
  return { ok: !error, ms, error: error ? String(error.message || error) : null };
}

module.exports = { beat, dbPing };
