#!/bin/bash

# SigNoz Git Bash Build Script
# This script builds the SigNoz project on Windows using Git Bash

echo "Building SigNoz on Windows using Git Bash..."
echo

# Check if Go is installed
if command -v go &> /dev/null; then
    echo "✓ Go found: $(go version)"
else
    echo "✗ Go not found. Please install Go from https://go.dev/dl/"
    exit 1
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    echo "✓ Node.js found: $(node --version)"
else
    echo "✗ Node.js not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Yarn is installed
if command -v yarn &> /dev/null; then
    echo "✓ Yarn found: $(yarn --version)"
else
    echo "✗ Yarn not found. Installing Yarn..."
    npm install -g yarn
    if [ $? -ne 0 ]; then
        echo "✗ Failed to install Yarn"
        exit 1
    fi
    echo "✓ Yarn installed: $(yarn --version)"
fi

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✓ Docker found: $(docker --version)"
else
    echo "✗ Docker not found. Please install Docker Desktop from https://docs.docker.com/get-docker/"
    exit 1
fi

# Create target directory
TARGET_DIR="target"
if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
    echo "Created target directory: $TARGET_DIR"
fi

echo
echo "Building Go backend..."

# Build community version
echo "Building community version..."
cd cmd/community
export GOOS=windows
export GOARCH=amd64
export CGO_ENABLED=1

go build -o "../../$TARGET_DIR/signoz-community.exe" -tags timetzdata
if [ $? -ne 0 ]; then
    echo "✗ Go community backend build failed"
    exit 1
fi

cd ../..

# Build enterprise version
echo "Building enterprise version..."
cd cmd/enterprise
export GOOS=windows
export GOARCH=amd64
export CGO_ENABLED=1

go build -o "../../$TARGET_DIR/signoz.exe" -tags timetzdata
if [ $? -ne 0 ]; then
    echo "✗ Go enterprise backend build failed"
    exit 1
fi

cd ../..

echo "✓ Go backend built successfully"

echo
echo "Building frontend..."
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
yarn install
if [ $? -ne 0 ]; then
    echo "✗ Frontend dependencies installation failed"
    exit 1
fi

# Build frontend
echo "Building frontend for production..."
yarn build
if [ $? -ne 0 ]; then
    echo "✗ Frontend build failed"
    exit 1
fi

cd ..

echo
echo "✓ Frontend built successfully"

echo
echo "Build completed successfully!"
echo "Backend binaries: $TARGET_DIR/"
echo "Frontend build: frontend/build/"
echo
echo "Ready to build Docker images!"
echo
echo "To build Docker images:"
echo "  # Community version:"
echo "  docker build -t signoz-community:latest -f cmd/community/Dockerfile ."
echo "  # Enterprise version:"
echo "  docker build -t signoz:latest -f cmd/enterprise/Dockerfile ."
echo
echo "To run the backend locally:"
echo "  cd cmd/community"
echo "  ./signoz-community.exe server --config ../../conf/prometheus.yml --cluster cluster"
echo
echo "To run the frontend locally:"
echo "  cd frontend"
echo "  yarn dev"
