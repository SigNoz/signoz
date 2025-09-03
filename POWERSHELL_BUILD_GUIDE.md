# Complete PowerShell Build Guide for SigNoz Docker Images

This guide will walk you through building SigNoz Docker images on Windows using PowerShell.

## Why PowerShell?

PowerShell offers several advantages for building on Windows:
- **Native Windows support** - No need for Git Bash or WSL
- **Better error handling** - More detailed error messages
- **Integrated with Windows** - Better PATH and environment variable handling
- **Execution Policy control** - Secure script execution
- **Rich object handling** - Better output formatting

## Prerequisites Installation

### 1. Install Go
1. Download Go from [go.dev/dl](https://go.dev/dl/)
2. Choose Windows MSI installer (e.g., `go1.21.0.windows-amd64.msi`)
3. Run installer as Administrator
4. **Important**: Check "Add to PATH" during installation
5. Restart PowerShell after installation
6. Verify installation:
   ```powershell
   go version
   ```

### 2. Install Node.js
1. Download from [nodejs.org](https://nodejs.org)
2. Choose LTS version (recommended)
3. Run installer as Administrator
4. **Important**: Check "Add to PATH" during installation
5. Restart PowerShell after installation
6. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

### 3. Install Yarn
1. Open PowerShell as Administrator and run:
   ```powershell
   npm install -g yarn
   ```
2. Verify installation:
   ```powershell
   yarn --version
   ```

### 4. Install Docker Desktop
1. Download from [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)
2. Install Docker Desktop for Windows
3. **Important**: Enable WSL 2 backend during installation
4. Start Docker Desktop
5. Wait for Docker to fully start (green icon in system tray)
6. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

## PowerShell Execution Policy

Before running scripts, you may need to adjust the execution policy:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow local scripts (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or allow all scripts (less secure, use only if needed)
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser
```

## Building the Project

### Step 1: Clone the Repository
```powershell
# If you haven't already cloned the repository
git clone https://github.com/SigNoz/signoz.git
cd signoz
```

### Step 2: Build the Project
Use the provided PowerShell build script:
```powershell
# Run the build script
.\build.ps1
```

**What the build script does:**
- Checks if all required tools are installed
- Builds Go backend binaries for Windows
- Builds the React frontend
- Creates a `target` directory with binaries
- Creates a `frontend/build` directory

### Step 3: Build Docker Images
Use the PowerShell Docker build script:
```powershell
# Run the Docker build script
.\docker-build.ps1
```

**What the Docker build script does:**
- Checks if Docker is running
- Verifies all prerequisites are built
- Builds community Docker image
- Builds enterprise Docker image
- Shows available images and usage instructions

## Manual Build Commands

If you prefer to build manually instead of using scripts:

### Build Backend
```powershell
# Create target directory
New-Item -ItemType Directory -Path "target" -Force

# Build community version
cd cmd/community
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "1"
go build -o "..\..\target\signoz-community.exe" -tags timetzdata
cd ..\..

# Build enterprise version
cd cmd/enterprise
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "1"
go build -o "..\..\target\signoz.exe" -tags timetzdata
cd ..\..
```

### Build Frontend
```powershell
cd frontend
yarn install
yarn build
cd ..
```

### Build Docker Images
```powershell
# Community version
docker build -t signoz-community:latest -f cmd/community/Dockerfile .

# Enterprise version
docker build -t signoz:latest -f cmd/enterprise/Dockerfile .
```

## PowerShell-Specific Features

### Better Error Handling
PowerShell provides more detailed error information:
```powershell
try {
    go build -o "target/signoz.exe" -tags timetzdata
} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception)" -ForegroundColor Red
}
```

### Environment Variable Management
```powershell
# Set environment variables
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "1"

# Check environment variables
Get-ChildItem Env: | Where-Object {$_.Name -like "GO*"}
```

### Path Management
```powershell
# Add to PATH temporarily
$env:PATH += ";C:\Program Files\Go\bin"

# Check if tool is in PATH
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "Go is available in PATH" -ForegroundColor Green
} else {
    Write-Host "Go is not in PATH" -ForegroundColor Red
}
```

## Troubleshooting

### Common Issues

#### 1. "go: command not found"
```powershell
# Check if Go is in PATH
Get-Command go -ErrorAction SilentlyContinue

# Add Go to PATH manually
$env:PATH += ";C:\Program Files\Go\bin"

# Or restart PowerShell after installation
```

#### 2. "node: command not found"
```powershell
# Check if Node.js is in PATH
Get-Command node -ErrorAction SilentlyContinue

# Add Node.js to PATH manually
$env:PATH += ";C:\Program Files\nodejs"
```

#### 3. "yarn: command not found"
```powershell
# Check if Yarn is installed
Get-Command yarn -ErrorAction SilentlyContinue

# Install Yarn globally
npm install -g yarn

# Check npm global path
npm config get prefix
```

#### 4. "docker: command not found"
```powershell
# Check if Docker is running
docker info

# Start Docker Desktop manually
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

#### 5. Execution Policy Issues
```powershell
# Check execution policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Environment Variables
If you encounter issues, set these manually:
```powershell
$env:PATH += ";C:\Program Files\Go\bin"
$env:PATH += ";C:\Program Files\nodejs"
$env:PATH += ";$env:APPDATA\npm"
```

## Running the Built Images

### Community Version
```powershell
docker run -p 8080:8080 signoz-community:latest
```

### Enterprise Version
```powershell
docker run -p 8080:8080 signoz:latest
```

### With Custom Configuration
```powershell
docker run -p 8080:8080 `
  -e SIGNOZ_SQLSTORE_SQLITE_PATH=/tmp/signoz.db `
  -e SIGNOZ_WEB_ENABLED=true `
  signoz-community:latest
```

## Development Workflow

1. **Initial Setup**: Install all tools once
2. **Daily Development**: 
   - `.\build.ps1` (when backend changes)
   - `cd frontend; yarn dev` (for frontend development)
3. **Docker Builds**: `.\docker-build.ps1` (when ready to deploy)

## File Structure After Build

```
signoz/
├── target/
│   ├── signoz-community.exe
│   └── signoz.exe
├── frontend/
│   ├── build/          # Production frontend
│   └── src/            # Source code
├── build.ps1           # PowerShell build script
├── docker-build.ps1    # PowerShell Docker build script
└── POWERSHELL_BUILD_GUIDE.md
```

## PowerShell Scripts Available

1. **`build.ps1`** - Main build script for backend and frontend
2. **`docker-build.ps1`** - Docker image build script
3. **`build.bat`** - Windows batch file alternative
4. **`build.sh`** - Git Bash alternative

## Next Steps

After building successfully:
1. Test the Docker images locally
2. Push to your container registry
3. Deploy to your infrastructure
4. Configure monitoring and logging

## Support

If you encounter issues:
1. Check this guide first
2. Verify all tools are properly installed
3. Check PowerShell execution policy
4. Check the [SigNoz documentation](https://signoz.io/docs/)
5. Join the [SigNoz Slack community](https://signoz.io/slack)
6. Open an issue on [GitHub](https://github.com/SigNoz/signoz/issues)
