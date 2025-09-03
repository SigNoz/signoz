# Build Linux Binaries for Docker using a Linux Container
# This script builds Linux binaries for SigNoz Docker images by using a Linux container

Write-Host "Building Linux binaries for Docker using Linux container..." -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
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

# Build using a Linux container
Write-Host "Building Go backend for Linux using Docker..." -ForegroundColor Yellow

# Create a temporary Dockerfile for building
$dockerfileContent = @"
FROM golang:1.25-alpine

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build community version
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /app/signoz-community -tags timetzdata ./cmd/community

# Build enterprise version
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /app/signoz -tags timetzdata ./cmd/enterprise

# Create output directory
RUN mkdir -p /app/output

# Move binaries to output directory
RUN mv /app/signoz-community /app/output/ && mv /app/signoz /app/output/
"@

Set-Content -Path "Dockerfile.build" -Value $dockerfileContent

try {
    Write-Host "Building Linux binaries in Docker container..." -ForegroundColor Yellow
    
    # Build the container
    docker build -f Dockerfile.build -t signoz-builder .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker build completed successfully" -ForegroundColor Green
        
        # Extract the binaries
        Write-Host "Extracting Linux binaries..." -ForegroundColor Yellow
        
        # Create a temporary container to copy files from
        docker create --name temp-signoz-builder signoz-builder
        
        # Copy the binaries
        docker cp temp-signoz-builder:/app/output/signoz-community "$linuxTargetDir/"
        docker cp temp-signoz-builder:/app/output/signoz "$linuxTargetDir/"
        
        # Clean up temporary container
        docker rm temp-signoz-builder
        
        # Verify the binaries
        if ((Test-Path "$linuxTargetDir/signoz-community") -and (Test-Path "$linuxTargetDir/signoz")) {
            Write-Host "✓ Linux binaries extracted successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to extract Linux binaries" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✗ Docker build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error during Docker build: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temporary Dockerfile
    if (Test-Path "Dockerfile.build") {
        Remove-Item "Dockerfile.build" -ErrorAction SilentlyContinue
    }
}

Write-Host "✓ Go backend built successfully for Linux" -ForegroundColor Green

# Verify Linux binaries
Write-Host
Write-Host "Linux binaries created:" -ForegroundColor Cyan
Get-ChildItem $linuxTargetDir

Write-Host
Write-Host "Linux build completed successfully!" -ForegroundColor Green
Write-Host "You can now run: .\docker-build.ps1" -ForegroundColor Cyan
