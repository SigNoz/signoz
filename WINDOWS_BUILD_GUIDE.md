# SigNoz Windows Build Guide

This guide will walk you through building SigNoz on Windows from scratch, including all prerequisites, building Linux binaries, and creating Docker images.

## Prerequisites

### 1. Install Go (1.25.0 or later)
- Download from: https://go.dev/dl/
- Install to default location: `C:\Program Files\Go\`
- Add to PATH: `C:\Program Files\Go\bin`

### 2. Install Node.js (v20.17.0 or later)
- Download LTS from: https://nodejs.org/
- Install to default location
- Verify: `node --version` and `npm --version`

### 3. Install Yarn
```powershell
npm install -g yarn
```

### 4. Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop
- Verify: `docker version`

### 5. Install MinGW-w64 (GCC Compiler)
```powershell
# Option A: Using Chocolatey (if available)
choco install mingw -y

# Option B: Manual installation
# Download from: https://www.mingw-w64.org/downloads/
# Extract to C:\mingw64
# Add C:\mingw64\bin to PATH
```

## Environment Setup

### 1. Set PATH Environment Variables
```powershell
# Add Go to PATH (if not already set)
$env:PATH += ";C:\Program Files\Go\bin"

# Add MinGW to PATH (adjust path as needed)
$env:PATH += ";C:\mingw64\bin"
# OR if nested installation:
$env:PATH += ";C:\mingw64\mingw64\bin"

# Verify tools are accessible
go version
gcc --version
node --version
yarn --version
docker version
```

### 2. Clone SigNoz Repository
```powershell
git clone https://github.com/SigNoz/signoz.git
cd signoz
```

## Build Process

### Step 1: Build Linux Binaries for Docker
```powershell
# Build Linux binaries using Docker container
.\build-linux-docker.ps1
```

This creates:
- `target/linux-amd64/signoz-community`
- `target/linux-amd64/signoz`

### Step 2: Build Docker Images
```powershell
# Build final Docker images
.\docker-build.ps1
```

This creates:
- `signoz-community:latest`
- `signoz:latest`

## Running SigNoz

### Option 1: Run with ClickHouse Database
```powershell
# Start ClickHouse
docker run -d --name signoz-clickhouse -p 9000:9000 -p 8123:8123 clickhouse/clickhouse-server:24.1.2-alpine

# Wait for ClickHouse to be ready
Start-Sleep -Seconds 15

# Run SigNoz
docker run -p 8080:8080 -e SIGNOZ_JWT_SECRET=mysecret123 -e SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://host.docker.internal:9000 -v signoz-sqlite:/var/lib/signoz --name signoz-app signoz-community:latest
```

### Option 2: Use docker-compose
```yaml
# Create docker-compose.local.yaml
version: '3'
services:
  signoz:
    image: signoz-community:latest
    ports:
      - '8080:8080'
    environment:
      - SIGNOZ_JWT_SECRET=mysecret123
      - SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://clickhouse:9000
    depends_on:
      - clickhouse
    restart: unless-stopped

  clickhouse:
    image: clickhouse/clickhouse-server:24.1.2-alpine
    ports:
      - '9000:9000'
      - '8123:8123'
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    restart: unless-stopped

volumes:
  clickhouse-data:
```

```powershell
# Run with compose
docker-compose -f docker-compose.local.yaml up -d
```

## Access SigNoz

- **Web UI**: http://localhost:8080
- **Health Check**: http://localhost:8080/api/v1/health

## Troubleshooting

### Common Issues

#### 1. "Go not found"
```powershell
# Add Go to PATH
$env:PATH += ";C:\Program Files\Go\bin"
# Verify
go version
```

#### 2. "gcc not found"
```powershell
# Add MinGW to PATH
$env:PATH += ";C:\mingw64\bin"
# OR for nested installation
$env:PATH += ";C:\mingw64\mingw64\bin"
# Verify
gcc --version
```

#### 3. "Node version incompatible"
```powershell
# Upgrade Node.js to LTS version (v20.x.x or later)
# Download from https://nodejs.org/
```

#### 4. "Docker not running"
- Start Docker Desktop
- Wait for it to fully initialize
- Verify: `docker version`

#### 5. "Backend binaries not found"
```powershell
# Run Linux build first
.\build-linux-docker.ps1
```

## Verification

### Check Built Binaries
```powershell
# Linux binaries
Get-ChildItem target\linux-amd64\

# Docker images
docker images | findstr signoz
```

## Notes

- **CGO Required**: SigNoz requires CGO for SQLite support
- **Cross-compilation**: Linux binaries are built in Docker containers to avoid cross-compilation issues
- **Memory**: Docker builds may require 4GB+ RAM
- **Disk Space**: Build process requires ~2-3GB free space

---

**Happy Building! 🚀**
