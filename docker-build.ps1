# SigNoz Docker Build Script for PowerShell
# This script builds Docker images for SigNoz

Write-Host "Building SigNoz Docker Images..." -ForegroundColor Green
Write-Host

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if we have the required binaries
if (!(Test-Path "target\signoz-community.exe") -or !(Test-Path "target\signoz.exe")) {
    Write-Host "✗ Backend binaries not found. Please run build.ps1 first." -ForegroundColor Red
    Write-Host "  .\build.ps1" -ForegroundColor Yellow
    exit 1
}

if (!(Test-Path "frontend\build")) {
    Write-Host "✗ Frontend build not found. Please run build.ps1 first." -ForegroundColor Red
    Write-Host "  .\build.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ All prerequisites found. Building Docker images..." -ForegroundColor Green
Write-Host

# Build community version
Write-Host "Building community Docker image..." -ForegroundColor Yellow
try {
    docker build -t signoz-community:latest -f cmd/community/Dockerfile .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Community Docker image built successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Community Docker build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Community Docker build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host

# Build enterprise version
Write-Host "Building enterprise Docker image..." -ForegroundColor Yellow
try {
    docker build -t signoz:latest -f cmd/enterprise/Dockerfile .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Enterprise Docker image built successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Enterprise Docker build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Enterprise Docker build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host
Write-Host "Docker build completed successfully!" -ForegroundColor Green
Write-Host

# Show available images
Write-Host "Available images:" -ForegroundColor Cyan
docker images | Select-String "signoz"

Write-Host
Write-Host "To run the community version:" -ForegroundColor Yellow
Write-Host "  docker run -p 8080:8080 signoz-community:latest" -ForegroundColor White

Write-Host
Write-Host "To run the enterprise version:" -ForegroundColor Yellow
Write-Host "  docker run -p 8080:8080 signoz:latest" -ForegroundColor White

Write-Host
Write-Host "To push to a registry:" -ForegroundColor Yellow
Write-Host "  docker tag signoz-community:latest your-registry/signoz-community:latest" -ForegroundColor White
Write-Host "  docker push your-registry/signoz-community:latest" -ForegroundColor White
