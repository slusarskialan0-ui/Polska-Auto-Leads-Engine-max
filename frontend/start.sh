#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Polska Auto Leads Engine - Frontend ==="
echo "Instalowanie zależności..."
npm install --silent

echo "Uruchamianie panelu web na http://localhost:3000 ..."
npm run dev
