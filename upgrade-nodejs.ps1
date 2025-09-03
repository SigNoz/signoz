# Upgrade Node.js for SigNoz Build
# This script helps upgrade Node.js to a compatible version

Write-Host "Upgrading Node.js for SigNoz build..." -ForegroundColor Green
Write-Host

# Check current Node.js version
$currentVersion = node --version
Write-Host "Current Node.js version: $currentVersion" -ForegroundColor Yellow

# Parse version number
$versionMatch = $currentVersion -match "v(\d+)\.(\d+)\.(\d+)"
if ($versionMatch) {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    $patch = [int]$matches[3]
    
    Write-Host "Version breakdown: Major=$major, Minor=$minor, Patch=$patch" -ForegroundColor Gray
    
    # Check if version meets requirements
    $requiredVersion = "16.15.0"
    $requiredMatch = $requiredVersion -match "(\d+)\.(\d+)\.(\d+)"
    if ($requiredMatch) {
        $reqMajor = [int]$matches[1]
        $reqMinor = [int]$matches[2]
        $reqPatch = [int]$matches[3]
        
        if ($major -gt $reqMajor -or ($major -eq $reqMajor -and $minor -gt $reqMinor) -or ($major -eq $reqMajor -and $minor -eq $reqMinor -and $patch -ge $reqPatch)) {
            Write-Host "✓ Node.js version meets requirements!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "✗ Node.js version does not meet requirements" -ForegroundColor Red
            Write-Host "  Required: >= $requiredVersion" -ForegroundColor Yellow
            Write-Host "  Current: $currentVersion" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ Could not parse Node.js version" -ForegroundColor Red
    exit 1
}

Write-Host
Write-Host "Upgrade options:" -ForegroundColor Cyan
Write-Host "1. Download and install Node.js LTS manually" -ForegroundColor White
Write-Host "2. Install nvm-windows for version management" -ForegroundColor White
Write-Host "3. Check if Chocolatey can upgrade Node.js" -ForegroundColor White
Write-Host "4. Exit" -ForegroundColor White

Write-Host
$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "Manual Node.js installation:" -ForegroundColor Yellow
        Write-Host "1. Go to https://nodejs.org/" -ForegroundColor White
        Write-Host "2. Download the LTS version (recommended)" -ForegroundColor White
        Write-Host "3. Run installer as Administrator" -ForegroundColor White
        Write-Host "4. Check 'Add to PATH' during installation" -ForegroundColor White
        Write-Host "5. Restart PowerShell after installation" -ForegroundColor White
        Write-Host "6. Verify with: node --version" -ForegroundColor White
    }
    "2" {
        Write-Host "Installing nvm-windows:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor White
        Write-Host "2. Download nvm-setup.exe" -ForegroundColor White
        Write-Host "3. Run installer as Administrator" -ForegroundColor White
        Write-Host "4. Restart PowerShell" -ForegroundColor White
        Write-Host "5. Install Node.js LTS: nvm install 20.11.1" -ForegroundColor White
        Write-Host "6. Use it: nvm use 20.11.1" -ForegroundColor White
    }
    "3" {
        Write-Host "Checking Chocolatey availability..." -ForegroundColor Yellow
        
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Host "✓ Chocolatey found. Upgrading Node.js..." -ForegroundColor Green
            try {
                choco upgrade nodejs -y
                Write-Host "✓ Node.js upgrade completed" -ForegroundColor Green
                Write-Host "Please restart PowerShell and verify with: node --version" -ForegroundColor Yellow
            } catch {
                Write-Host "✗ Chocolatey upgrade failed: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Chocolatey not found in PATH" -ForegroundColor Red
            Write-Host "Try adding Chocolatey to PATH first:" -ForegroundColor Yellow
            Write-Host "  \$env:PATH += ';C:\ProgramData\chocolatey\bin'" -ForegroundColor Gray
        }
    }
    "4" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host
Write-Host "After upgrading Node.js:" -ForegroundColor Yellow
Write-Host "1. Restart PowerShell" -ForegroundColor White
Write-Host "2. Verify version: node --version" -ForegroundColor White
Write-Host "3. Run: .\build.ps1" -ForegroundColor White
