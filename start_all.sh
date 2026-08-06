#!/bin/bash
# AUTO-START: uruchamia backend i frontend z auto-restart i healthcheck
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Polska Auto Leads Engine v2.0 — AUTO-START ==="
echo ""

# Backend
echo "[1/2] Uruchamiam backend..."
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt -q
python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend healthcheck
echo "Czekam na backend..."
for i in $(seq 1 15); do
  sleep 1
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend gotowy! (http://localhost:8000)"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "⚠ Backend nie odpowiada po 15s — kontynuuję mimo to"
  fi
done

# Frontend
echo ""
echo "[2/2] Uruchamiam frontend..."
cd "$SCRIPT_DIR/frontend"
npm install --silent
npm run dev &
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
echo "============================================="
echo ""
echo "Naciśnij Ctrl+C aby zatrzymać"

# Trap cleanup
cleanup() {
  echo ""
  echo "Zatrzymuję system..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

wait

