#!/bin/bash

# Build script for GRPC Client Go binary
# This script builds the React UI first, then the Go binary with embedded static files

set -e

echo "🏗️  Building GRPC Client with integrated React UI..."

# Step 1: Build React UI
echo "⚛️  Building React UI..."
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

# Step 2: Copy React build to Go static directory
echo "📂 Copying React build to Go static directory..."
mkdir -p go-grpc-client/static
cp -r web-ui/dist/* go-grpc-client/static/

# Verify static files were copied
if [ ! -f "go-grpc-client/static/index.html" ]; then
    echo "❌ Failed to copy React build files"
    exit 1
fi

echo "✅ React UI integrated into Go project!"

# Step 3: Build Go binaries
echo "🐹 Building Go binaries..."

# Change to the Go project directory
cd go-grpc-client

# Clean any existing binaries
echo "🧹 Cleaning existing binaries..."
rm -f grpc-client grpc-client-*

# Create releases directory in parent folder
mkdir -p ../releases
echo "📁 Created releases directory"

# Build for macOS (Intel)
echo "🍎 Building for macOS Intel (amd64)..."
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o ../releases/grpc-client-darwin-amd64 main.go

# Build for macOS (Apple Silicon)
echo "🍎 Building for macOS Apple Silicon (arm64)..."
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o ../releases/grpc-client-darwin-arm64 main.go

# Build for Linux
echo "🐧 Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o ../releases/grpc-client-linux-amd64 main.go

# Build for Windows
echo "🪟 Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o ../releases/grpc-client-windows-amd64.exe main.go

# Create universal binary for macOS (optional)
echo "🔗 Creating universal macOS binary..."
lipo -create -output ../releases/grpc-client-darwin-universal ../releases/grpc-client-darwin-amd64 ../releases/grpc-client-darwin-arm64

# Show file sizes
echo "📊 Build completed! File sizes:"
ls -lh ../releases/grpc-client-*

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 Available binaries in releases/ directory:"
echo "  • grpc-client-darwin-amd64     (macOS Intel)"
echo "  • grpc-client-darwin-arm64     (macOS Apple Silicon)"
echo "  • grpc-client-darwin-universal (macOS Universal)"
echo "  • grpc-client-linux-amd64      (Linux)"
echo "  • grpc-client-windows-amd64.exe (Windows)"
echo ""
echo "🔗 To create a GitHub release:"
echo "  1. Tag your repository: git tag v2.1.0"
echo "  2. Push the tag: git push origin v2.1.0"
echo "  3. Upload binaries from releases/ directory to the GitHub release"
echo "  4. Update the SHA256 hash in grpc-client.rb"
echo ""

# Calculate SHA256 for all platforms (updated for new Homebrew formula)
if command -v shasum > /dev/null; then
    echo "🔐 SHA256 hashes for Homebrew formula:"
    echo "Intel macOS: $(shasum -a 256 ../releases/grpc-client-darwin-amd64 | cut -d' ' -f1)"
    echo "ARM64 macOS: $(shasum -a 256 ../releases/grpc-client-darwin-arm64 | cut -d' ' -f1)"
    echo "Linux:       $(shasum -a 256 ../releases/grpc-client-linux-amd64 | cut -d' ' -f1)"
    echo ""
    echo "📝 Update these hashes in grpc-client.rb"
fi

echo "🎉 Ready for distribution with integrated React UI!"
echo "📦 All binaries are available in the releases/ directory"
