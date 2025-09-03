#!/bin/bash

# SigNoz Docker Build Script for Git Bash
# This script builds Docker images for SigNoz

echo "Building SigNoz Docker Images..."
echo

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "✗ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if we have the required binaries
if [ ! -f "target/signoz-community.exe" ] || [ ! -f "target/signoz.exe" ]; then
    echo "✗ Backend binaries not found. Please run build.sh first."
    echo "  ./build.sh"
    exit 1
fi

if [ ! -d "frontend/build" ]; then
    echo "✗ Frontend build not found. Please run build.sh first."
    echo "  ./build.sh"
    exit 1
fi

echo "✓ All prerequisites found. Building Docker images..."
echo

# Build community version
echo "Building community Docker image..."
docker build -t signoz-community:latest -f cmd/community/Dockerfile .
if [ $? -ne 0 ]; then
    echo "✗ Community Docker build failed"
    exit 1
fi
echo "✓ Community Docker image built successfully"

echo

# Build enterprise version
echo "Building enterprise Docker image..."
docker build -t signoz:latest -f cmd/enterprise/Dockerfile .
if [ $? -ne 0 ]; then
    echo "✗ Enterprise Docker build failed"
    exit 1
fi
echo "✓ Enterprise Docker image built successfully"

echo
echo "Docker build completed successfully!"
echo
echo "Available images:"
docker images | grep signoz
echo
echo "To run the community version:"
echo "  docker run -p 8080:8080 signoz-community:latest"
echo
echo "To run the enterprise version:"
echo "  docker run -p 8080:8080 signoz:latest"
echo
echo "To push to a registry:"
echo "  docker tag signoz-community:latest your-registry/signoz-community:latest"
echo "  docker push your-registry/signoz-community:latest"
