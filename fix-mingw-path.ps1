# Fix MinGW Nested Directory Issue
# This script fixes the MinGW installation path and updates PATH accordingly

Write-Host "Fixing MinGW nested directory issue..." -ForegroundColor Green
Write-Host

# Check current MinGW locations
$expectedPath = "C:\mingw64\bin\gcc.exe"
$actualPath = "C:\mingw64\mingw64\bin\gcc.exe"

Write-Host "Checking MinGW installation..." -ForegroundColor Yellow

if (Test-Path $expectedPath) {
    Write-Host "✓ MinGW found at expected location: $expectedPath" -ForegroundColor Green
    $correctPath = "C:\mingw64\bin"
} elseif (Test-Path $actualPath) {
    Write-Host "✓ MinGW found at: $actualPath" -ForegroundColor Green
    Write-Host "  (nested directory detected)" -ForegroundColor Yellow
    $correctPath = "C:\mingw64\mingw64\bin"
} else {
    Write-Host "✗ MinGW not found at either location" -ForegroundColor Red
    Write-Host "Please install MinGW first using: .\install-mingw-direct.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host
Write-Host "Current PATH analysis:" -ForegroundColor Yellow

# Check current PATH for MinGW entries
$pathEntries = $env:PATH -split ";"
$mingwPaths = $pathEntries | Where-Object { $_ -like "*mingw*" }

if ($mingwPaths) {
    Write-Host "Found MinGW paths in current session PATH:" -ForegroundColor Cyan
    $mingwPaths | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "No MinGW paths found in current session PATH" -ForegroundColor Red
}

Write-Host

# Fix PATH
Write-Host "Fixing PATH..." -ForegroundColor Yellow

# Remove any existing MinGW paths
$env:PATH = ($pathEntries | Where-Object { $_ -notlike "*mingw*" }) -join ";"

# Add the correct MinGW path
$env:PATH += ";$correctPath"

Write-Host "✓ Updated PATH to use: $correctPath" -ForegroundColor Green

# Verify GCC is accessible
Write-Host
Write-Host "Verifying GCC accessibility..." -ForegroundColor Yellow

if (Get-Command gcc -ErrorAction SilentlyContinue) {
    $gccVersion = gcc --version | Select-Object -First 1
    Write-Host "✓ GCC is now accessible: $gccVersion" -ForegroundColor Green
} else {
    Write-Host "✗ GCC still not accessible" -ForegroundColor Red
    Write-Host "Trying to fix nested directory structure..." -ForegroundColor Yellow
    
    # Try to fix the nested directory structure
    if ($correctPath -eq "C:\mingw64\mingw64\bin" -and (Test-Path "C:\mingw64\mingw64")) {
        try {
            Write-Host "Moving files from nested directory..." -ForegroundColor Yellow
            
            # Create backup of current files
            if (Test-Path "C:\mingw64\bin") {
                Rename-Item "C:\mingw64\bin" "C:\mingw64\bin_backup" -Force
            }
            
            # Move files from nested directory
            Move-Item "C:\mingw64\mingw64\*" "C:\mingw64\" -Force
            
            # Remove empty nested directory
            Remove-Item "C:\mingw64\mingw64" -Force
            
            # Update PATH to use correct location
            $env:PATH = ($env:PATH -split ";" | Where-Object { $_ -notlike "*mingw*" }) -join ";"
            $env:PATH += ";C:\mingw64\bin"
            
            Write-Host "✓ Fixed nested directory structure" -ForegroundColor Green
            
            # Test GCC again
            if (Get-Command gcc -ErrorAction SilentlyContinue) {
                $gccVersion = gcc --version | Select-Object -First 1
                Write-Host "✓ GCC is now accessible: $gccVersion" -ForegroundColor Green
            } else {
                Write-Host "✗ GCC still not accessible after fix" -ForegroundColor Red
            }
        } catch {
            Write-Host "✗ Failed to fix nested directory: $_" -ForegroundColor Red
        }
    }
}

Write-Host
Write-Host "PATH fix completed!" -ForegroundColor Green
Write-Host "You can now run: .\build.ps1" -ForegroundColor Cyan
Write-Host
Write-Host "Note: This PATH change is only for the current PowerShell session." -ForegroundColor Yellow
Write-Host "For permanent changes, add '$correctPath' to your system PATH." -ForegroundColor Yellow
