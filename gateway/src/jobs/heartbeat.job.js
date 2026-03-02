// Loads .env for this standalone process.
// English comments per project rule.
const path = require("path");
const dotenv = require("dotenv");

const dotenvPath = process.env.DOTENV_PATH
  ? path.resolve(process.env.DOTENV_PATH)
  : path.resolve(process.cwd(), ".env");

dotenv.config({ path: dotenvPath, override: true });

const { beat, dbPing } = require("../system/heartbeatService");

async function loop() {
  const intervalSec = Number(process.env.HEARTBEAT_INTERVAL_SEC || 30);

  // Minimal debug (do not print secrets)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Heartbeat job error: Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.error("Loaded dotenv from:", dotenvPath);
    process.exit(1);
  }

  while (true) {
    try {
      const ping = await dbPing();
      if (ping.ok) {
        await beat({ component: "api", status: "OK", meta: { dbMs: ping.ms, job: true } });
      } else {
        await beat({ component: "api", status: "DEGRADED", lastError: ping.error, meta: { dbMs: ping.ms, job: true } });
      }
    } catch (e) {
      console.error("Heartbeat job error:", e.message || e);
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
}

loop();
