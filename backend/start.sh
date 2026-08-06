#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Polska Auto Leads Engine - Backend ==="
echo "Instalowanie zależności..."
pip install -r requirements.txt -q

echo "Uruchamianie serwera API na http://localhost:8000 ..."
python main.py
