# SigNoz Windows Build Script
# This script builds the SigNoz project on Windows without requiring make

Write-Host "Building SigNoz on Windows..." -ForegroundColor Green

# Check if Go is installed
try {
    $goVersion = go version 2>$null
    if ($goVersion) {
        Write-Host "✓ Go found: $goVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Go not found. Please install Go from https://go.dev/dl/" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Go not found. Please install Go from https://go.dev/dl/" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if Yarn is installed
try {
    $yarnVersion = yarn --version 2>$null
    if ($yarnVersion) {
        Write-Host "✓ Yarn found: $yarnVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Yarn not found. Installing Yarn..." -ForegroundColor Yellow
        npm install -g yarn
        $yarnVersion = yarn --version
        Write-Host "✓ Yarn installed: $yarnVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Yarn not found. Installing Yarn..." -ForegroundColor Yellow
    npm install -g yarn
    $yarnVersion = yarn --version
    Write-Host "✓ Yarn installed: $yarnVersion" -ForegroundColor Green
}

# Create target directory
$targetDir = "target"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
    Write-Host "Created target directory: $targetDir" -ForegroundColor Yellow
}

# Build Go backend
Write-Host "Building Go backend..." -ForegroundColor Yellow

# Build community version
Write-Host "Building community version..." -ForegroundColor Yellow
cd cmd/community

# Set environment variables for the build
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "1"

# Build the binary
try {
    go build -o "../../$targetDir/signoz-community.exe" -tags timetzdata
    if (Test-Path "../../$targetDir/signoz-community.exe") {
        Write-Host "✓ Go community backend built successfully: $targetDir/signoz-community.exe" -ForegroundColor Green
    } else {
        Write-Host "✗ Go community backend build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Go community backend build failed: $_" -ForegroundColor Red
    exit 1
}

cd ../..

# Build enterprise version
Write-Host "Building enterprise version..." -ForegroundColor Yellow
cd cmd/enterprise

# Set environment variables for the build
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "1"

# Build the binary
try {
    go build -o "../../$targetDir/signoz.exe" -tags timetzdata
    if (Test-Path "../../$targetDir/signoz.exe") {
        Write-Host "✓ Go enterprise backend built successfully: $targetDir/signoz.exe" -ForegroundColor Green
    } else {
        Write-Host "✗ Go enterprise backend build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Go enterprise backend build failed: $_" -ForegroundColor Red
    exit 1
}

cd ../..

Write-Host "✓ Go backend built successfully" -ForegroundColor Green

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
cd frontend

# Install dependencies (skip husky on Windows)
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
try {
    # Set environment variable to skip husky on Windows
    $env:SKIP_HUSKY = "true"
    yarn install --ignore-scripts
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend dependencies installation failed: $_" -ForegroundColor Red
    exit 1
}

# Build frontend
Write-Host "Building frontend for production..." -ForegroundColor Yellow
try {
    yarn build
    if (Test-Path "build") {
        Write-Host "✓ Frontend built successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Frontend build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Frontend build failed: $_" -ForegroundColor Red
    exit 1
}

cd ..

Write-Host
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Backend binaries: $targetDir/" -ForegroundColor Cyan
Write-Host "Frontend build: frontend/build/" -ForegroundColor Cyan
Write-Host
Write-Host "Ready to build Docker images!" -ForegroundColor Green
Write-Host "Run: .\docker-build.ps1" -ForegroundColor Cyan
