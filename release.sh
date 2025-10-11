#!/bin/bash

# Release preparation script for Pulse API Client
# This script helps prepare everything for a new release

set -e

# Show help message
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "🚀 Pulse API Client Release Script"
    echo "=================================="
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
    echo "  2. Builds React UI (via build-ui.sh)"
    echo "  3. Builds Go binaries for all platforms"
    echo "  4. Calculates SHA256 hashes"
    echo "  5. Updates Homebrew formula"
    echo "  6. Creates release directory"
    echo ""
    exit 0
fi

# Check if version was provided as argument, otherwise prompt user
if [ -z "$1" ]; then
    echo "🚀 Pulse API Client Release Preparation"
    echo "======================================="
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
        echo "    • web-ui/package.json version to v${VERSION}"
        echo "    • Build React UI and integrate into Go project"
        echo "    • Build Go binaries for all platforms"
        echo "    • Update pulse.rb with new version and SHA256 hashes"
        echo ""
        
        read -p "Continue with release v${VERSION}? (y/N): " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]
        then
            echo "🚫 Release cancelled."
            exit 1
        fi
    else
        echo "❌ web-ui/package.json not found. Cannot determine current version."
        echo "Please specify the version manually: ./release.sh <VERSION>"
        exit 1
    fi
else
    VERSION=$1
fi

echo "🚀 Starting release process for v${VERSION}..."

# Step 1: Update version in package.json
if [ -f "web-ui/package.json" ]; then
    echo "📝 Updating web-ui/package.json to version v${VERSION}..."
    # Use perl for in-place replacement compatible with macOS and Linux
    perl -pi -e "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"${VERSION}\"/" web-ui/package.json
    echo "✅ web-ui/package.json updated."
else
    echo "❌ web-ui/package.json not found. Skipping version update."
fi

# Step 2: Build React UI and copy to Go static directory
./build-ui.sh

# Step 3: Build Go binaries
echo "🐹 Building Go binaries..."
./build.sh

# Step 4: Create release directory
echo "📁 Creating release directory..."
mkdir -p releases/v${VERSION}
mv releases/pulse-* releases/v${VERSION}/

# Step 5: Calculate SHA256 for all platforms
echo "🔐 Calculating SHA256 for all platforms..."
INTEL_SHA=$(shasum -a 256 releases/v${VERSION}/pulse-darwin-amd64 | cut -d' ' -f1)
ARM64_SHA=$(shasum -a 256 releases/v${VERSION}/pulse-darwin-arm64 | cut -d' ' -f1)
LINUX_SHA=$(shasum -a 256 releases/v${VERSION}/pulse-linux-amd64 | cut -d' ' -f1)

# Step 6: Update Homebrew formula with version and SHA256 hashes
echo "📝 Updating Homebrew formula..."

# Update version
sed -i.bak "s/version \".*\"/version \"${VERSION}\"/" pulse.rb

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
' pulse.rb > pulse.rb.tmp && mv pulse.rb.tmp pulse.rb

# Verify the updates were successful
if grep -q "version \"${VERSION}\"" pulse.rb; then
    echo "✅ Version updated to ${VERSION}"
else
    echo "❌ Failed to update version"
fi

if grep -q "${INTEL_SHA}" pulse.rb; then
    echo "✅ Intel SHA256 updated"
else
    echo "❌ Failed to update Intel SHA256"
fi

if grep -q "${ARM64_SHA}" pulse.rb; then
    echo "✅ ARM64 SHA256 updated"
else
    echo "❌ Failed to update ARM64 SHA256"
fi

if grep -q "${LINUX_SHA}" pulse.rb; then
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