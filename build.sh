#!/bin/bash

# Build script for Pulse API Client Go binary
# This script builds the Go binary with embedded static files

set -e

echo "🏗️  Building Pulse API Client Go binary..."

# Step 3: Build Go binaries
echo "🐹 Building Go binaries..."

# Change to the Go project directory
cd web-api

# Clean any existing binaries
echo "🧹 Cleaning existing binaries..."
rm -f pulse pulse-*

# Create releases directory in parent folder
mkdir -p ../releases
echo "📁 Created releases directory"

# Build for macOS (Intel)
echo "🍎 Building for macOS Intel (amd64)..."
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o ../releases/pulse-darwin-amd64 main.go

# Build for macOS (Apple Silicon)
echo "🍎 Building for macOS Apple Silicon (arm64)..."
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o ../releases/pulse-darwin-arm64 main.go

# Build for Linux
echo "🐧 Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o ../releases/pulse-linux-amd64 main.go

# Build for Windows
echo "🪟 Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o ../releases/pulse-windows-amd64.exe main.go

# Create universal binary for macOS (optional)
echo "🔗 Creating universal macOS binary..."
lipo -create -output ../releases/pulse-darwin-universal ../releases/pulse-darwin-amd64 ../releases/pulse-darwin-arm64

# Show file sizes
echo "📊 Build completed! File sizes:"
ls -lh ../releases/pulse-*

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 Available binaries in releases/ directory:"
echo "  • pulse-darwin-amd64     (macOS Intel)"
echo "  • pulse-darwin-arm64     (macOS Apple Silicon)"
echo "  • pulse-darwin-universal (macOS Universal)"
echo "  • pulse-linux-amd64      (Linux)"
echo "  • pulse-windows-amd64.exe (Windows)"
echo ""
echo "🔗 To create a GitHub release:"
echo "  1. Tag your repository: git tag v2.1.0"
echo "  2. Push the tag: git push origin v2.1.0"
echo "  3. Upload binaries from releases/ directory to the GitHub release"
echo "  4. Update the SHA256 hash in pulse.rb"
echo ""

# Calculate SHA256 for all platforms (updated for new Homebrew formula)
if command -v shasum > /dev/null; then
    echo "🔐 SHA256 hashes for Homebrew formula:"
    echo "Intel macOS: $(shasum -a 256 ../releases/pulse-darwin-amd64 | cut -d' ' -f1)"
    echo "ARM64 macOS: $(shasum -a 256 ../releases/pulse-darwin-arm64 | cut -d' ' -f1)"
    echo "Linux:       $(shasum -a 256 ../releases/pulse-linux-amd64 | cut -d' ' -f1)"
    echo ""
    echo "📝 Update these hashes in pulse.rb"
fi

echo "🎉 Ready for distribution with integrated React UI!"
echo "📦 All binaries are available in the releases/ directory"