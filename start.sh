#!/bin/bash

echo "🚀 Memulai SigNoz Development Environment..."

# 1. Jalankan ClickHouse & OTel di Docker/OrbStack
echo "🐳 Menjalankan ClickHouse & OTel Collector (Docker)..."
make devenv-up

# 2. Jalankan Backend Go di background
echo "⚙️ Menjalankan Backend (Go)..."
nohup make go-run-community > backend.log 2>&1 &
BACKEND_PID=$!

# 3. Jalankan Frontend di background
echo "🎨 Menjalankan Frontend (Vite)..."
cd frontend
nohup pnpm dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "------------------------------------------------"
echo "✅ SigNoz berhasil dijalankan di background!"
echo "🔗 Frontend UI: http://localhost:3301"
echo "🔗 Backend API: http://localhost:8080"
echo "🔗 ClickHouse:  http://localhost:8123"
echo "------------------------------------------------"
echo "PID Backend : $BACKEND_PID (Log: backend.log)"
echo "PID Frontend: $FRONTEND_PID (Log: frontend.log)"
echo "------------------------------------------------"
echo "Gunakan './stop.sh' untuk mematikan semua layanan."
