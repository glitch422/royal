#!/usr/bin/env bash
set -euo pipefail

BASE="${TEST_API_BASE_URL:-http://localhost:3000/api/v1}"

echo "== Health =="
curl -sS "${BASE}/system/health" | python3 -m json.tool || true
echo

echo "== Admin Status =="
curl -sS "${BASE}/admin/system/status" | python3 -m json.tool || true
echo
