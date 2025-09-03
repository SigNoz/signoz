# Install GCC for SigNoz Build
# This script helps install GCC to fix CGO compilation issues

Write-Host "Installing GCC for SigNoz CGO compilation..." -ForegroundColor Green
Write-Host

# Check if GCC is already installed
if (Get-Command gcc -ErrorAction SilentlyContinue) {
    $gccVersion = gcc --version | Select-Object -First 1
    Write-Host "✓ GCC already installed: $gccVersion" -ForegroundColor Green
    exit 0
}

Write-Host "GCC not found. Installing MinGW-w64..." -ForegroundColor Yellow
Write-Host

# Check if Chocolatey is available
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Chocolatey found. Installing MinGW..." -ForegroundColor Green
    try {
        choco install mingw -y
        Write-Host "✓ MinGW installed via Chocolatey" -ForegroundColor Green
        
        # Refresh PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
        
        # Verify installation
        if (Get-Command gcc -ErrorAction SilentlyContinue) {
            $gccVersion = gcc --version | Select-Object -First 1
            Write-Host "✓ GCC installed successfully: $gccVersion" -ForegroundColor Green
        } else {
            Write-Host "✗ GCC installation failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Chocolatey installation failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Chocolatey not found. Manual installation required." -ForegroundColor Yellow
    Write-Host
    Write-Host "Please choose one of these options:" -ForegroundColor Cyan
    Write-Host
    Write-Host "Option 1: Install Chocolatey (recommended)" -ForegroundColor White
    Write-Host "  Run PowerShell as Administrator and execute:" -ForegroundColor Gray
    Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Gray
    Write-Host
    Write-Host "Option 2: Manual MinGW-w64 installation" -ForegroundColor White
    Write-Host "  1. Download from: https://github.com/niXman/mingw-builds-binaries/releases" -ForegroundColor Gray
    Write-Host "  2. Extract to C:\mingw64" -ForegroundColor Gray
    Write-Host "  3. Add C:\mingw64\bin to your PATH" -ForegroundColor Gray
    Write-Host
    Write-Host "Option 3: Install TDM-GCC" -ForegroundColor White
    Write-Host "  1. Download from: https://jmeubank.github.io/tdm-gcc/" -ForegroundColor Gray
    Write-Host "  2. Run installer and follow prompts" -ForegroundColor Gray
    Write-Host
    Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
}

Write-Host
Write-Host "Note: After installing GCC, you may need to:" -ForegroundColor Yellow
Write-Host "1. Restart PowerShell" -ForegroundColor White
Write-Host "2. Run: .\fix-path.ps1" -ForegroundColor White
Write-Host "3. Run: .\build.ps1" -ForegroundColor White
