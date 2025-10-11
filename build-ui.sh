#!/bin/bash

# Build script for React UI
# This script builds the React UI and copies it to the Go static directory

set -e

echo "🏗️  Building Pulse API Client UI..."
cd web-ui

# Check if Node.js and npm are available
if ! command -v npm > /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies and build
echo "📦 Installing React dependencies..."
npm install

echo "🔨 Building React production bundle..."
npm run build

# Verify build was successful
if [ ! -d "dist" ]; then
    echo "❌ React build failed - dist directory not found"
    exit 1
fi

echo "✅ React UI built successfully!"
cd ..

# Copy React build to Go static directory
echo "📂 Copying React build to Go static directory..."
mkdir -p web-api/static
cp -r web-ui/dist/* web-api/static/

# Verify static files were copied
if [ ! -f "web-api/static/index.html" ]; then
    echo "❌ Failed to copy React build files"
    exit 1
fi

echo "✅ React UI integrated into Go project!"