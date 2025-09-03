
# Build Linux Binaries for Docker
# This script builds Linux binaries for SigNoz Docker images

Write-Host "Building Linux binaries for Docker..." -ForegroundColor Green

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

# Create target directories
$targetDir = "target"
$linuxTargetDir = "$targetDir/linux-amd64"

if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}
if (!(Test-Path $linuxTargetDir)) {
    New-Item -ItemType Directory -Path $linuxTargetDir | Out-Null
}

Write-Host "Created target directory: $linuxTargetDir" -ForegroundColor Yellow

# Build Go backend for Linux
Write-Host "Building Go backend for Linux..." -ForegroundColor Yellow

# Build community version for Linux
Write-Host "Building community version for Linux..." -ForegroundColor Yellow
cd cmd/community

# Set environment variables for Linux build
$env:GOOS = "linux"
$env:GOARCH = "amd64"

# Try building with CGO first (might work with proper cross-compiler)
Write-Host "Attempting build with CGO enabled..." -ForegroundColor Gray
$env:CGO_ENABLED = "1"

# Use $LASTEXITCODE to check if go build succeeded
go build -o "../../$linuxTargetDir/signoz-community" -tags "timetzdata" 2>$null
if ($LASTEXITCODE -eq 0 -and (Test-Path "../../$linuxTargetDir/signoz-community")) {
    Write-Host "✓ Go community backend built successfully for Linux with CGO: $linuxTargetDir/signoz-community" -ForegroundColor Green
} else {
    Write-Host "CGO build failed, trying without CGO..." -ForegroundColor Yellow
    
    # Try building without CGO
    $env:CGO_ENABLED = "0"
    Write-Host "Building with GOOS=linux, GOARCH=amd64, CGO_ENABLED=0" -ForegroundColor Gray
    
    go build -o "../../$linuxTargetDir/signoz-community" -tags "timetzdata" 2>$null
    if ($LASTEXITCODE -eq 0 -and (Test-Path "../../$linuxTargetDir/signoz-community")) {
        Write-Host "✓ Go community backend built successfully for Linux without CGO: $linuxTargetDir/signoz-community" -ForegroundColor Green
    } else {
        Write-Host "✗ Go community backend build failed without CGO" -ForegroundColor Red
        exit 1
    }
}

cd ../..

# Build enterprise version for Linux
Write-Host "Building enterprise version for Linux..." -ForegroundColor Yellow
cd cmd/enterprise

# Set environment variables for Linux build
$env:GOOS = "linux"
$env:GOARCH = "amd64"

# Try building with CGO first
Write-Host "Attempting build with CGO enabled..." -ForegroundColor Gray
$env:CGO_ENABLED = "1"

# Use $LASTEXITCODE to check if go build succeeded
go build -o "../../$linuxTargetDir/signoz" -tags "timetzdata" 2>$null
if ($LASTEXITCODE -eq 0 -and (Test-Path "../../$linuxTargetDir/signoz")) {
    Write-Host "✓ Go enterprise backend built successfully for Linux with CGO: $linuxTargetDir/signoz" -ForegroundColor Green
} else {
    Write-Host "CGO build failed, trying without CGO..." -ForegroundColor Yellow
    
    # Try building without CGO
    $env:CGO_ENABLED = "0"
    Write-Host "Building with GOOS=linux, GOARCH=amd64, CGO_ENABLED=0" -ForegroundColor Gray
    
    go build -o "../../$linuxTargetDir/signoz" -tags "timetzdata" 2>$null
    if ($LASTEXITCODE -eq 0 -and (Test-Path "../../$linuxTargetDir/signoz")) {
        Write-Host "✓ Go enterprise backend built successfully for Linux without CGO: $linuxTargetDir/signoz" -ForegroundColor Green
    } else {
        Write-Host "✗ Go enterprise backend build failed without CGO" -ForegroundColor Red
        exit 1
    }
}

cd ../..

Write-Host "✓ Go backend built successfully for Linux" -ForegroundColor Green

# Verify Linux binaries
Write-Host
Write-Host "Linux binaries created:" -ForegroundColor Cyan
Get-ChildItem $linuxTargetDir

Write-Host
Write-Host "Linux build completed successfully!" -ForegroundColor Green
Write-Host "You can now run: .\docker-build.ps1" -ForegroundColor Cyan
