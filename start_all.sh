#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

cleanup() {
  echo ""
  echo "Zatrzymuję system..."
  kill ${BACKEND_PID:-0} ${FRONTEND_PID:-0} 2>/dev/null || true
}
trap cleanup EXIT SIGINT SIGTERM

echo "=== Polska Auto Leads Engine v3.1 — AUTO-START ==="
echo ""

echo "[1/2] Uruchamiam backend..."
cd "$BACKEND_DIR"
pip install -r requirements.txt -q
python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "Czekam na backend..."
for i in $(seq 1 20); do
  sleep 1
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend gotowy! (http://localhost:8000)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "⚠ Backend nie odpowiada po 20s — kontynuuję mimo to"
  fi
done

echo ""
echo "[2/2] Uruchamiam frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "============================================="
echo "  🇵🇱 System działa!"
echo "  📊 Panel web:     http://localhost:3000"
echo "  🔌 Backend API:   http://localhost:8000"
echo "  📖 API Docs:      http://localhost:8000/docs"
echo "  📡 Health:        http://localhost:8000/health"
echo "  📈 Metryki:       http://localhost:8000/metrics"
echo "  🧰 Ops dashboard: http://localhost:8000/system/ops-dashboard"
echo "============================================="
echo ""
echo "Naciśnij Ctrl+C aby zatrzymać"

wait
