#!/bin/bash

# Release preparation script for GRPC Client
# This script helps prepare everything for a new release

set -e

VERSION=${1:-"2.1.0"}

echo "🚀 Preparing release v${VERSION}..."

# Step 1: Build the React UI
echo "⚛️  Building React UI..."
cd web-ui

# Check if Node.js and npm are available
if ! command -v npm > /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm first."
    exit 1
fi

npm install
npm run build

# Verify build was successful
if [ ! -d "dist" ]; then
    echo "❌ React build failed - dist directory not found"
    exit 1
fi

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

# Step 3: Build Go binaries
echo "🏗️ Building Go binaries..."
./build.sh

# Step 4: Create release directory
echo "📁 Creating release directory..."
mkdir -p releases/v${VERSION}
cp go-grpc-client/grpc-client-* releases/v${VERSION}/

# Step 5: Calculate SHA256 for all platforms
echo "🔐 Calculating SHA256 for all platforms..."
INTEL_SHA=$(shasum -a 256 go-grpc-client/grpc-client-darwin-amd64 | cut -d' ' -f1)
ARM64_SHA=$(shasum -a 256 go-grpc-client/grpc-client-darwin-arm64 | cut -d' ' -f1)
LINUX_SHA=$(shasum -a 256 go-grpc-client/grpc-client-linux-amd64 | cut -d' ' -f1)

# Step 6: Update Homebrew formula with all SHA256 hashes
echo "📝 Updating Homebrew formula..."
sed -i.bak "s/version \".*\"/version \"${VERSION}\"/" grpc-client.rb
sed -i.bak "s/UPDATE_INTEL_SHA256/${INTEL_SHA}/" grpc-client.rb
sed -i.bak "s/UPDATE_ARM64_SHA256/${ARM64_SHA}/" grpc-client.rb
sed -i.bak "s/UPDATE_LINUX_SHA256/${LINUX_SHA}/" grpc-client.rb

echo ""
echo "✅ Release v${VERSION} prepared successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Commit the changes: git add . && git commit -m 'Release v${VERSION}'"
echo "  2. Create and push tag: git tag v${VERSION} && git push origin v${VERSION}"
echo "  3. Create GitHub release and upload binaries from releases/v${VERSION}/"
echo "  4. Test Homebrew installation"
echo ""
echo "🔗 Binaries location: releases/v${VERSION}/"
echo "� macOS Intel SHA256: ${INTEL_SHA}"
echo "🍎 macOS ARM64 SHA256: ${ARM64_SHA}"
echo "🐧 Linux SHA256: ${LINUX_SHA}"
echo ""
echo "✨ No Go installation required for end users!"
echo "🎉 Ready for release!"
