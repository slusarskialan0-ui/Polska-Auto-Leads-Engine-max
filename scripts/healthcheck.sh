#!/bin/bash
set -euo pipefail
BACKEND_URL="${1:-http://localhost:8000}"
FRONTEND_URL="${2:-http://localhost:3000}"

echo "[healthcheck] Backend: $BACKEND_URL/health"
curl -fsS "$BACKEND_URL/health" >/dev/null

echo "[healthcheck] Frontend: $FRONTEND_URL"
curl -fsS "$FRONTEND_URL" >/dev/null

echo "✅ Healthcheck OK"
