#!/bin/bash

# Release preparation script for GRPC Client
# This script helps prepare everything for a new release

set -e

# Show help message
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "🚀 GRPC Client Release Script"
    echo "============================="
    echo ""
    echo "Usage:"
    echo "  ./release.sh [VERSION]     # Release with specific version"
    echo "  ./release.sh               # Interactive mode (menu-driven)"
    echo "  ./release.sh --help        # Show this help message"
    echo ""
    echo "Interactive Mode:"
    echo "  When run without arguments, you'll be prompted to choose:"
    echo "    1) Patch Release (bug fixes)     → increments patch version"
    echo "    2) Minor Release (new features)  → increments minor version"
    echo "    3) Major Release (breaking)      → increments major version"
    echo ""
    echo "Examples:"
    echo "  ./release.sh 3.5.0         # Release version 3.5.0"
    echo "  ./release.sh               # Interactive menu mode"
    echo ""
    echo "What this script does:"
    echo "  1. Updates package.json version"
    echo "  2. Builds React UI"
    echo "  3. Copies UI to Go static directory"
    echo "  4. Builds Go binaries for all platforms"
    echo "  5. Calculates SHA256 hashes"
    echo "  6. Updates Homebrew formula"
    echo "  7. Creates release directory"
    echo ""
    exit 0
fi

# Check if version was provided as argument, otherwise prompt user
if [ -z "$1" ]; then
    echo "🚀 GRPC Client Release Preparation"
    echo "=================================="
    echo ""
    
    # Show current version from package.json
    if [ -f "web-ui/package.json" ]; then
        CURRENT_VERSION=$(grep '"version":' web-ui/package.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
        echo "📦 Current version: v${CURRENT_VERSION}"
        
        # Extract major, minor, patch for automatic calculation
        IFS='.' read -r -a version_parts <<< "$CURRENT_VERSION"
        MAJOR=${version_parts[0]}
        MINOR=${version_parts[1]}
        PATCH=${version_parts[2]}
        
        # Calculate version options
        PATCH_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        MINOR_VERSION="${MAJOR}.$((MINOR + 1)).0"
        MAJOR_VERSION="$((MAJOR + 1)).0.0"
        
        echo ""
        echo "🎯 Select the type of release:"
        echo ""
        echo "  1) 🔧 Patch Release (bug fixes, patches)     → v${PATCH_VERSION}"
        echo "  2) ✨ Minor Release (new features)           → v${MINOR_VERSION}"
        echo "  3) 💥 Major Release (breaking changes)       → v${MAJOR_VERSION}"
        echo ""
        
        while true; do
            read -p "Choose release type (1/2/3): " -n 1 -r
            echo ""
            
            case $REPLY in
                1)
                    VERSION=$PATCH_VERSION
                    RELEASE_TYPE="🔧 Patch (bug fixes)"
                    break
                    ;;
                2)
                    VERSION=$MINOR_VERSION
                    RELEASE_TYPE="✨ Minor (new features)"
                    break
                    ;;
                3)
                    VERSION=$MAJOR_VERSION
                    RELEASE_TYPE="💥 Major (breaking changes)"
                    break
                    ;;
                *)
                    echo "❌ Invalid choice. Please enter 1, 2, or 3."
                    ;;
            esac
        done
        
        echo ""
        echo "📋 Release Summary:"
        echo "  Type: ${RELEASE_TYPE}"
        echo "  Version: v${CURRENT_VERSION} → v${VERSION}"
        echo "  This will update:"
        echo "    • package.json version"
        echo "    • Homebrew formula version"
        echo "    • Calculate and update SHA256 hashes"
        echo "    • Build binaries for all platforms"
        echo ""
        read -p "Continue with release v${VERSION}? (Y/n): " -n 1 -r
        echo ""
        
        # Proceed on 'y', 'Y', or empty input (Enter)
        if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
            echo "✅ Proceeding with release..."
        else
            echo "❌ Release cancelled by user"
            exit 1
        fi
        echo ""
    else
        echo "❌ web-ui/package.json not found. Cannot determine current version."
        exit 1
    fi
else
    VERSION=$1
    echo "🚀 Preparing release v${VERSION} (provided as argument)..."
fi

echo "🚀 Starting release preparation for v${VERSION}..."

# Step 1: Update package.json version
echo "📝 Updating package.json version to v${VERSION}..."
if [ -f "web-ui/package.json" ]; then
    # Use sed to update the version in package.json
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" web-ui/package.json
    echo "✅ Updated web-ui/package.json version to ${VERSION}"
else
    echo "❌ web-ui/package.json not found"
    exit 1
fi

# Step 2: Build the React UI
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

# Step 3: Copy React build to Go static directory
echo "📂 Copying React build to Go static directory..."
mkdir -p go-grpc-client/static
cp -r web-ui/dist/* go-grpc-client/static/

# Verify static files were copied
if [ ! -f "go-grpc-client/static/index.html" ]; then
    echo "❌ Failed to copy React build files"
    exit 1
fi

# Step 4: Build Go binaries
echo "🏗️ Building Go binaries..."
./build.sh

# Step 5: Create release directory
echo "📁 Creating release directory..."
mkdir -p releases/v${VERSION}
mv releases/grpc-client-* releases/v${VERSION}/

# Step 6: Calculate SHA256 for all platforms
echo "🔐 Calculating SHA256 for all platforms..."
INTEL_SHA=$(shasum -a 256 releases/v${VERSION}/grpc-client-darwin-amd64 | cut -d' ' -f1)
ARM64_SHA=$(shasum -a 256 releases/v${VERSION}/grpc-client-darwin-arm64 | cut -d' ' -f1)
LINUX_SHA=$(shasum -a 256 releases/v${VERSION}/grpc-client-linux-amd64 | cut -d' ' -f1)

# Step 7: Update Homebrew formula with version and SHA256 hashes
echo "📝 Updating Homebrew formula..."

# Update version
sed -i.bak "s/version \".*\"/version \"${VERSION}\"/" grpc-client.rb

# Update SHA256 values using awk (still shell, much simpler)
awk -v intel="$INTEL_SHA" -v arm64="$ARM64_SHA" -v linux="$LINUX_SHA" '
/sha256/ {
    sha_count++
    if (sha_count == 1) {
        sub(/sha256 "[^"]*"/, "sha256 \"" intel "\"")
    } else if (sha_count == 2) {
        sub(/sha256 "[^"]*"/, "sha256 \"" arm64 "\"")
    } else if (sha_count == 3) {
        sub(/sha256 "[^"]*"/, "sha256 \"" linux "\"")
    }
}
{ print }
' grpc-client.rb > grpc-client.rb.tmp && mv grpc-client.rb.tmp grpc-client.rb

# Verify the updates were successful
if grep -q "version \"${VERSION}\"" grpc-client.rb; then
    echo "✅ Version updated to ${VERSION}"
else
    echo "❌ Failed to update version"
fi

if grep -q "${INTEL_SHA}" grpc-client.rb; then
    echo "✅ Intel SHA256 updated"
else
    echo "❌ Failed to update Intel SHA256"
fi

if grep -q "${ARM64_SHA}" grpc-client.rb; then
    echo "✅ ARM64 SHA256 updated"
else
    echo "❌ Failed to update ARM64 SHA256"
fi

if grep -q "${LINUX_SHA}" grpc-client.rb; then
    echo "✅ Linux SHA256 updated"
else
    echo "❌ Failed to update Linux SHA256"
fi

echo "✅ Updated Homebrew formula with new version and SHA256 hashes"

# Show the updated SHA256 values for verification
echo ""
echo "📋 Updated Homebrew formula values:"
echo "  Version: v${VERSION}"
echo "  Intel SHA256: ${INTEL_SHA}"
echo "  ARM64 SHA256: ${ARM64_SHA}"
echo "  Linux SHA256: ${LINUX_SHA}"

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
echo "🍎 macOS Intel SHA256: ${INTEL_SHA}"
echo "🍎 macOS ARM64 SHA256: ${ARM64_SHA}"
echo "🐧 Linux SHA256: ${LINUX_SHA}"
echo ""
echo "📝 Updated versions:"
echo "  • package.json: v${VERSION}"
echo "  • Homebrew formula: v${VERSION}"
echo ""
echo "✨ No Go installation required for end users!"
echo "🎉 Ready for release!"
