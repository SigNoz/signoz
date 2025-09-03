# Manage PATH for SigNoz Build
# This script helps manage PATH environment variables

Write-Host "PATH Management for SigNoz Build" -ForegroundColor Green
Write-Host

# Check current session PATH
Write-Host "Current session PATH:" -ForegroundColor Yellow
$env:PATH -split ";" | Where-Object { $_ -like "*mingw*" -or $_ -like "*Go*" -or $_ -like "*node*" } | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Write-Host

# Check if MinGW is in PATH
$mingwInPath = $env:PATH -like "*mingw64*"
if ($mingwInPath) {
    Write-Host "✓ MinGW is already in current session PATH" -ForegroundColor Green
} else {
    Write-Host "✗ MinGW is NOT in current session PATH" -ForegroundColor Red
}

# Check if Go is in PATH
$goInPath = $env:PATH -like "*Go*"
if ($goInPath) {
    Write-Host "✓ Go is already in current session PATH" -ForegroundColor Green
} else {
    Write-Host "✗ Go is NOT in current session PATH" -ForegroundColor Red
}

Write-Host

# Options menu
Write-Host "Choose an option:" -ForegroundColor Cyan
Write-Host "1. Add MinGW to current session PATH (temporary)" -ForegroundColor White
Write-Host "2. Add Go to current session PATH (temporary)" -ForegroundColor White
Write-Host "3. Add both to current session PATH (temporary)" -ForegroundColor White
Write-Host "4. Show current session PATH" -ForegroundColor White
Write-Host "5. Test if tools are accessible" -ForegroundColor White
Write-Host "6. Exit" -ForegroundColor White

Write-Host
$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "Adding MinGW to current session PATH..." -ForegroundColor Yellow
        $env:PATH += ";C:\mingw64\bin"
        Write-Host "✓ MinGW added to current session PATH" -ForegroundColor Green
    }
    "2" {
        Write-Host "Adding Go to current session PATH..." -ForegroundColor Yellow
        $env:PATH += ";C:\Program Files\Go\bin"
        Write-Host "✓ Go added to current session PATH" -ForegroundColor Green
    }
    "3" {
        Write-Host "Adding both to current session PATH..." -ForegroundColor Yellow
        $env:PATH += ";C:\mingw64\bin;C:\Program Files\Go\bin"
        Write-Host "✓ Both added to current session PATH" -ForegroundColor Green
    }
    "4" {
        Write-Host "Current session PATH:" -ForegroundColor Yellow
        $env:PATH -split ";" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
    "5" {
        Write-Host "Testing tool accessibility..." -ForegroundColor Yellow
        Write-Host
        
        # Test Go
        if (Get-Command go -ErrorAction SilentlyContinue) {
            $goVersion = go version
            Write-Host "✓ Go: $goVersion" -ForegroundColor Green
        } else {
            Write-Host "✗ Go: Not accessible" -ForegroundColor Red
        }
        
        # Test GCC
        if (Get-Command gcc -ErrorAction SilentlyContinue) {
            $gccVersion = gcc --version | Select-Object -First 1
            Write-Host "✓ GCC: $gccVersion" -ForegroundColor Green
        } else {
            Write-Host "✗ GCC: Not accessible" -ForegroundColor Red
        }
        
        # Test Node.js
        if (Get-Command node -ErrorAction SilentlyContinue) {
            $nodeVersion = node --version
            Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "✗ Node.js: Not accessible" -ForegroundColor Red
        }
    }
    "6" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host
Write-Host "Note: PATH changes in this session are temporary." -ForegroundColor Yellow
Write-Host "For permanent changes, use Windows Environment Variables GUI or:" -ForegroundColor Yellow
Write-Host "  [Environment]::SetEnvironmentVariable('PATH', \$env:PATH + ';C:\mingw64\bin', 'Machine')" -ForegroundColor Gray
