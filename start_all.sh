#!/bin/bash
# Auto-start: uruchamia backend i frontend jednocześnie
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Polska Auto Leads Engine - AUTO-START ==="
echo ""
echo "Uruchamiam backend..."
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt -q
python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo ""
echo "Czekam 3 sekundy na start backendu..."
sleep 3

echo "Uruchamiam frontend..."
cd "$SCRIPT_DIR/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "==================================="
echo " System działa!"
echo " Backend API:   http://localhost:8000"
echo " Dokumentacja:  http://localhost:8000/docs"
echo " Panel web:     http://localhost:3000"
echo "==================================="
echo ""
echo "Naciśnij Ctrl+C aby zatrzymać"
wait
