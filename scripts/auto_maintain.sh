#!/bin/bash
set -euo pipefail
API_URL="${1:-http://localhost:8000}"

echo "[auto-maintain] Fixing stalled pipelines"
curl -fsS -X POST "$API_URL/system/fix-pipeline-stall"

echo "[auto-maintain] Optimizing slow queries"
curl -fsS -X POST "$API_URL/system/fix-slow-queries"

echo "[auto-maintain] Done"
