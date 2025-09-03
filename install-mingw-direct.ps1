# Install MinGW Directly for SigNoz Build
# This script downloads and installs MinGW-w64 directly

Write-Host "Installing MinGW-w64 directly for SigNoz build..." -ForegroundColor Green
Write-Host

# Check if GCC is already installed
if (Get-Command gcc -ErrorAction SilentlyContinue) {
    $gccVersion = gcc --version | Select-Object -First 1
    Write-Host "✓ GCC already installed: $gccVersion" -ForegroundColor Green
    exit 0
}

# Set installation directory
$installDir = "C:\mingw64"
$binDir = "$installDir\bin"

# Check if already installed in expected location
if (Test-Path "$binDir\gcc.exe") {
    Write-Host "✓ MinGW found at: $installDir" -ForegroundColor Green
    
    # Add to current session PATH
    $env:PATH += ";$binDir"
    Write-Host "✓ Added MinGW to current session PATH" -ForegroundColor Green
    
    # Verify installation
    if (Get-Command gcc -ErrorAction SilentlyContinue) {
        $gccVersion = gcc --version | Select-Object -First 1
        Write-Host "✓ GCC verified: $gccVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ GCC verification failed" -ForegroundColor Red
    }
    exit 0
}

Write-Host "MinGW not found. Installing..." -ForegroundColor Yellow
Write-Host

# Check if 7-Zip is available for extraction
$sevenZipPath = $null
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    $sevenZipPath = "7z"
} elseif (Get-Command "C:\Program Files\7-Zip\7z.exe" -ErrorAction SilentlyContinue) {
    $sevenZipPath = "C:\Program Files\7-Zip\7z.exe"
} elseif (Get-Command "C:\Program Files (x86)\7-Zip\7z.exe" -ErrorAction SilentlyContinue) {
    $sevenZipPath = "C:\Program Files (x86)\7-Zip\7z.exe"
}

if (-not $sevenZipPath) {
    Write-Host "✗ 7-Zip not found. Please install 7-Zip first:" -ForegroundColor Red
    Write-Host "  Download from: https://7-zip.org/" -ForegroundColor Yellow
    Write-Host "  Or install via Chocolatey: choco install 7zip -y" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ 7-Zip found: $sevenZipPath" -ForegroundColor Green

# Download URL for MinGW-w64
$mingwUrl = "https://github.com/niXman/mingw-builds-binaries/releases/download/15.2.0-rt_v13-rev0/x86_64-15.2.0-release-posix-seh-ucrt-rt_v13-rev0.7z"
$downloadPath = "$env:TEMP\mingw64.zip"

Write-Host "Downloading MinGW-w64..." -ForegroundColor Yellow
Write-Host "URL: $mingwUrl" -ForegroundColor Gray

try {
    # Download MinGW
    Invoke-WebRequest -Uri $mingwUrl -OutFile $downloadPath -UseBasicParsing
    Write-Host "✓ Download completed: $downloadPath" -ForegroundColor Green
    
    # Create installation directory
    if (!(Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        Write-Host "✓ Created installation directory: $installDir" -ForegroundColor Green
    }
    
    # Extract MinGW
    Write-Host "Extracting MinGW..." -ForegroundColor Yellow
    if ($sevenZipPath -eq "7z") {
        & 7z x $downloadPath -o"$installDir" -y
    } else {
        & $sevenZipPath x $downloadPath -o"$installDir" -y
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Extraction completed" -ForegroundColor Green
        
        # Add to current session PATH
        $env:PATH += ";$binDir"
        Write-Host "✓ Added MinGW to current session PATH" -ForegroundColor Green
        
        # Verify installation
        if (Test-Path "$binDir\gcc.exe") {
            Write-Host "✓ MinGW files verified" -ForegroundColor Green
            
            # Test GCC
            if (Get-Command gcc -ErrorAction SilentlyContinue) {
                $gccVersion = gcc --version | Select-Object -First 1
                Write-Host "✓ GCC installation successful: $gccVersion" -ForegroundColor Green
            } else {
                Write-Host "✗ GCC not accessible after installation" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ MinGW files not found after extraction" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Extraction failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Download or installation failed: $_" -ForegroundColor Red
} finally {
    # Clean up download file
    if (Test-Path $downloadPath) {
        Remove-Item $downloadPath -Force
        Write-Host "✓ Cleaned up download file" -ForegroundColor Green
    }
}

Write-Host
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart PowerShell to ensure PATH changes take effect" -ForegroundColor White
Write-Host "2. Run: .\fix-path.ps1" -ForegroundColor White
Write-Host "3. Run: .\build.ps1" -ForegroundColor White
Write-Host
Write-Host "Note: For permanent PATH changes, add '$binDir' to your system PATH" -ForegroundColor Yellow
