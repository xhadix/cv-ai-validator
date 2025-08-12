#!/bin/bash

# Test Docker Build Script for CV AI Validator

set -e

echo "🧪 Testing Docker build for CV AI Validator..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Prisma files exist
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Prisma schema file not found at prisma/schema.prisma"
    exit 1
fi

echo "✅ Project structure looks good"

# Test Docker build
echo "🔨 Building Docker image..."
docker build -t cv-validator-test .

echo "✅ Docker build completed successfully!"

# Test running the container
echo "🚀 Testing container startup..."
docker run --rm -d --name cv-validator-test-container -p 3001:3000 cv-validator-test

# Wait a moment for the container to start
sleep 5

# Check if container is running
if docker ps | grep -q cv-validator-test-container; then
    echo "✅ Container is running"
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    if curl -f http://localhost:3001/api/health; then
        echo "✅ Health endpoint is working"
    else
        echo "❌ Health endpoint failed"
    fi
    
    # Stop the test container
    docker stop cv-validator-test-container
    echo "✅ Test container stopped"
else
    echo "❌ Container failed to start"
    docker logs cv-validator-test-container
    exit 1
fi

echo "🎉 All tests passed! Docker build is working correctly."
