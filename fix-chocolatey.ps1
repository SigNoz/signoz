# Fix Chocolatey PATH and Install MinGW
# This script fixes Chocolatey PATH issues and installs MinGW for SigNoz build

Write-Host "Fixing Chocolatey PATH and installing MinGW..." -ForegroundColor Green
Write-Host

# Check if Chocolatey is installed
$chocolateyPath = "C:\ProgramData\chocolatey\bin\choco.exe"
if (Test-Path $chocolateyPath) {
    Write-Host "✓ Chocolatey found at: $chocolateyPath" -ForegroundColor Green
    
    # Add Chocolatey to current session PATH
    $env:PATH += ";C:\ProgramData\chocolatey\bin"
    Write-Host "✓ Added Chocolatey to current session PATH" -ForegroundColor Green
    
    # Verify choco is accessible
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "✓ Chocolatey is now accessible" -ForegroundColor Green
        
        # Check if MinGW is already installed
        if (Get-Command gcc -ErrorAction SilentlyContinue) {
            $gccVersion = gcc --version | Select-Object -First 1
            Write-Host "✓ GCC already installed: $gccVersion" -ForegroundColor Green
        } else {
            Write-Host "Installing MinGW via Chocolatey..." -ForegroundColor Yellow
            try {
                choco install mingw -y
                Write-Host "✓ MinGW installed successfully" -ForegroundColor Green
                
                # Refresh PATH to include MinGW
                $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
                
                # Verify GCC installation
                if (Get-Command gcc -ErrorAction SilentlyContinue) {
                    $gccVersion = gcc --version | Select-Object -First 1
                    Write-Host "✓ GCC verified: $gccVersion" -ForegroundColor Green
                } else {
                    Write-Host "✗ GCC installation verification failed" -ForegroundColor Red
                }
            } catch {
                Write-Host "✗ MinGW installation failed: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "✗ Chocolatey still not accessible after adding to PATH" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Chocolatey not found at expected location" -ForegroundColor Red
    Write-Host "Please install Chocolatey first:" -ForegroundColor Yellow
    Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Gray
}

Write-Host
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If GCC is installed, restart PowerShell" -ForegroundColor White
Write-Host "2. Run: .\fix-path.ps1" -ForegroundColor White
Write-Host "3. Run: .\build.ps1" -ForegroundColor White
