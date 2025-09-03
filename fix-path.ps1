# Fix PATH for SigNoz Build
# This script adds Go to the current PowerShell session's PATH

Write-Host "Fixing PATH for SigNoz build..." -ForegroundColor Green

# Check if Go is installed
$goPath = "C:\Program Files\Go\bin\go.exe"
if (Test-Path $goPath) {
    Write-Host "✓ Go found at: $goPath" -ForegroundColor Green
    
    # Add Go to current session PATH
    $env:PATH += ";C:\Program Files\Go\bin"
    Write-Host "✓ Added Go to current session PATH" -ForegroundColor Green
    
    # Verify Go is accessible
    try {
        $goVersion = go version
        Write-Host "✓ Go is now accessible: $goVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Go still not accessible after adding to PATH" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ Go not found at expected location" -ForegroundColor Red
    Write-Host "Please install Go from https://go.dev/dl/" -ForegroundColor Yellow
    exit 1
}

# Check other required tools
Write-Host "`nChecking other required tools..." -ForegroundColor Yellow

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "  Current Node.js version: v16.13.0 (needs upgrade)" -ForegroundColor Yellow
}

# Check npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm not found in PATH" -ForegroundColor Red
}

# Check Yarn
if (Get-Command yarn -ErrorAction SilentlyContinue) {
    $yarnVersion = yarn --version
    Write-Host "✓ Yarn found: $yarnVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Yarn not found. Installing..." -ForegroundColor Yellow
    try {
        npm install -g yarn
        $yarnVersion = yarn --version
        Write-Host "✓ Yarn installed: $yarnVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to install Yarn" -ForegroundColor Red
    }
}

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        docker --version | Out-Null
        Write-Host "✓ Docker found and accessible" -ForegroundColor Green
    } catch {
        Write-Host "✗ Docker found but not accessible (may not be running)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Docker not found in PATH" -ForegroundColor Red
}

Write-Host "`nPATH fix completed!" -ForegroundColor Green
Write-Host "You can now run: .\build.ps1" -ForegroundColor Cyan
Write-Host "`nNote: This PATH change is only for the current PowerShell session." -ForegroundColor Yellow
Write-Host "For permanent fix, add 'C:\Program Files\Go\bin' to your system PATH." -ForegroundColor Yellow
