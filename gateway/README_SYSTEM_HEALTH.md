# ROYAL - System Health + Heartbeat Pack

Adds:
- DB tables: `system_heartbeats`, `system_flags`
- Heartbeat job to keep DB active + detect downtime
- Endpoints:
  - `GET /api/v1/system/status` (PUBLIC for players)
  - `GET /api/v1/admin/system/status` (Admin/Root, protected)

Notes:
- The server also includes an internal API heartbeat writer (enabled by default) so `system/status` becomes healthy even if you forget to run the standalone heartbeat job.
- For production you can keep both: API writer + heartbeat job + external pinger.

## 1) Apply migration
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install psycopg2-binary
python3 scripts/apply_system_heartbeat_migration.py
```

## 2) Install deps
```bash
npm i @supabase/supabase-js
```

## 3) Run heartbeat job (local)
```bash
DOTENV_PATH=.env node src/jobs/heartbeat.job.js
```

## 4) Test
```bash
curl -s http://localhost:3000/api/v1/system/status | python3 -m json.tool
curl -s http://localhost:3000/api/v1/admin/system/status | python3 -m json.tool
```

Simulate failure:
- stop backend OR stop heartbeat job
- wait > 120 sec
- call `/api/v1/admin/system/status` again
Expected: systemOnline=false and both actions disabled.

## 6) EC2 with PM2 (later)
```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Optional: external pinger (UptimeRobot/CloudWatch Synthetics) hits `/api/v1/system/status` every 1-5 minutes.
