#!/bin/bash

echo "🛑 Menghentikan SigNoz Development Environment..."

# 1. Hentikan Frontend (Vite)
echo "🎨 Menghentikan Frontend (Vite)..."
FE_PID=$(lsof -t -i:3301)
if [ ! -z "$FE_PID" ]; then
  kill -9 $FE_PID 2>/dev/null
  echo "   - Proses Frontend (PID $FE_PID) dihentikan."
else
  pkill -f "vite" 2>/dev/null
  echo "   - Proses Frontend dihentikan."
fi

# 2. Hentikan Backend (Go / community)
echo "⚙️ Menghentikan Backend (Go)..."
BE_PID=$(lsof -t -i:8080)
if [ ! -z "$BE_PID" ]; then
  kill -9 $BE_PID 2>/dev/null
  echo "   - Proses Backend (PID $BE_PID) dihentikan."
else
  pkill -f "community" 2>/dev/null
  pkill -f "go run" 2>/dev/null
  echo "   - Proses Backend dihentikan."
fi

# 3. Hentikan Container Docker Clickhouse & OTel
echo "🐳 Menghentikan Container Docker (ClickHouse & OTel)..."
if [ -d ".devenv/docker/signoz-otel-collector" ]; then
  cd .devenv/docker/signoz-otel-collector && docker compose down >/dev/null 2>&1
  cd ../clickhouse && docker compose down >/dev/null 2>&1
  cd ../../..
  echo "   - Container Docker dihentikan."
else
  echo "   - Direktori Docker compose tidak ditemukan."
fi

echo "------------------------------------------------"
echo "✅ Seluruh layanan SigNoz berhasil dihentikan!"
echo "------------------------------------------------"
