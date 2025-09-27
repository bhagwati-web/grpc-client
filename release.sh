#!/bin/bash

# Release preparation script for GRPC Client
# This script helps prepare everything for a new release

set -e

# Show help message
show_help() {
    echo "🚀 GRPC Client Release Script"
    echo "============================="
    echo ""
    echo "Usage:"
    echo "  ./release.sh [VERSION]     # Release with specific version"
    echo echo "📦 Updated Versions:"  ./release.sh               # Interactive mode (menu-driven)"
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
}

# Show help if requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
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

# Step 2: Build React UI and integrate with Go project
echo "🏗️ Building and integrating React UI..."
chmod +x build-ui.sh
./build-ui.sh

# Step 3: Build binaries for all platforms
echo "🏗️ Building binaries for all platforms..."

# Create release directory
RELEASE_DIR="$(pwd)/releases/v${VERSION}"
mkdir -p "$RELEASE_DIR"

# Define architectures - Using OS-specific naming conventions:
# - macOS: arm64 for ARM, amd64 for Intel
# - Linux: aarch64 for ARM, x86_64 for Intel
# - Windows: amd64 for Intel
ARCHITECTURES=(
    "darwin/arm64/arm64-tahoe"
    "darwin/arm64/arm64-sequoia"
    "darwin/arm64/arm64-sonoma"
    "darwin/arm64/arm64-ventura"
    "darwin/amd64/sonoma"
    "darwin/amd64/ventura"
    "linux/amd64/linux-amd64"
    "linux/arm64/linux-arm64"  # Go uses arm64, Homebrew formula uses aarch64_linux
    "windows/amd64/windows-amd64"
)

# Build and compress for each architecture
for arch in "${ARCHITECTURES[@]}"; do
    IFS='/' read -r os arch_type name <<< "$arch"
    echo "Building for $name..."
    
    # Set environment variables for build script
    export GOOS=$os
    export GOARCH=$arch_type
    export OUTPUT_NAME="${RELEASE_DIR}/grpc-client-${VERSION}-${name}"
    
    # Call build script
    if [ "$os" = "windows" ]; then
        OUTPUT_NAME="${OUTPUT_NAME}.exe" ./build.sh
        (cd "$RELEASE_DIR" && zip "grpc-client-${VERSION}-${name}.zip" "grpc-client-${VERSION}-${name}.exe" && rm "grpc-client-${VERSION}-${name}.exe")
    else
        OUTPUT_NAME="${OUTPUT_NAME}" ./build.sh
        tar czf "${OUTPUT_NAME}.tar.gz" "${OUTPUT_NAME}" && rm "${OUTPUT_NAME}"
    fi
done

# Step 6: Calculate SHA256 for compressed archives
echo "🔐 Calculating SHA256 for all platforms..."

# Initialize variables for each platform
# macOS ARM64 platforms
ARM64_TAHOE_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-arm64-tahoe.tar.gz" 2>/dev/null | cut -d' ' -f1)
ARM64_SEQUOIA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-arm64-sequoia.tar.gz" 2>/dev/null | cut -d' ' -f1)
ARM64_SONOMA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-arm64-sonoma.tar.gz" 2>/dev/null | cut -d' ' -f1)
ARM64_VENTURA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-arm64-ventura.tar.gz" 2>/dev/null | cut -d' ' -f1)

# macOS Intel platforms
SONOMA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-sonoma.tar.gz" 2>/dev/null | cut -d' ' -f1)
VENTURA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-ventura.tar.gz" 2>/dev/null | cut -d' ' -f1)

# Linux platforms (using Linux architecture naming: x86_64 and aarch64)
LINUX_AMD64_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-linux-amd64.tar.gz" 2>/dev/null | cut -d' ' -f1)
LINUX_ARM64_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-linux-arm64.tar.gz" 2>/dev/null | cut -d' ' -f1)

# Windows SHA is computed but not used in the formula since Homebrew is for macOS and Linux only
WINDOWS_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-windows-amd64.zip" 2>/dev/null | cut -d' ' -f1)
SONOMA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-sonoma.tar.gz" 2>/dev/null | cut -d' ' -f1)
VENTURA_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-ventura.tar.gz" 2>/dev/null | cut -d' ' -f1)
LINUX_AMD64_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-linux-amd64.tar.gz" 2>/dev/null | cut -d' ' -f1)
WINDOWS_SHA=$(shasum -a 256 "${RELEASE_DIR}/grpc-client-${VERSION}-windows-amd64.zip" 2>/dev/null | cut -d' ' -f1)

# Step 7: Update Homebrew formula with version and SHA256 hashes
echo "📝 Updating Homebrew formula..."

# Update version and SHA256 values in formula
echo "Updating formula SHA256 values..."
template_file="Formula/grpc-client.rb.template"
formula_file="Formula/grpc-client.rb"

# First verify we have values to update
echo "SHA256 values to be updated:"
echo "ARM64 Tahoe:   [${ARM64_TAHOE_SHA:-not built}]"
echo "ARM64 Sequoia: [${ARM64_SEQUOIA_SHA:-not built}]"
echo "ARM64 Sonoma:  [${ARM64_SONOMA_SHA:-not built}]"
echo "ARM64 Ventura: [${ARM64_VENTURA_SHA:-not built}]"
echo "Sonoma:        [${SONOMA_SHA:-not built}]"
echo "Ventura:       [${VENTURA_SHA:-not built}]"
echo "Linux AMD64:   [${LINUX_AMD64_SHA:-not built}]"

# Create a new formula file from template
cp "$template_file" "$formula_file"

# Update version and all hashes at once with proper handling of quotes
sed -i.bak -e '
    s/REPLACE_VERSION/'${VERSION}'/g
    s/"REPLACE_ARM64_TAHOE_SHA256"/"'${ARM64_TAHOE_SHA:-not built}'"/g
    s/"REPLACE_ARM64_SEQUOIA_SHA256"/"'${ARM64_SEQUOIA_SHA:-not built}'"/g
    s/"REPLACE_ARM64_SONOMA_SHA256"/"'${ARM64_SONOMA_SHA:-not built}'"/g
    s/"REPLACE_ARM64_VENTURA_SHA256"/"'${ARM64_VENTURA_SHA:-not built}'"/g
    s/"REPLACE_SONOMA_SHA256"/"'${SONOMA_SHA:-not built}'"/g
    s/"REPLACE_VENTURA_SHA256"/"'${VENTURA_SHA:-not built}'"/g
    s/"REPLACE_LINUX_AMD64_SHA256"/"'${LINUX_AMD64_SHA:-not built}'"/g
    s/"REPLACE_LINUX_ARM64_SHA256"/"'${LINUX_ARM64_SHA:-not built}'"/g
' "$formula_file"

# Clean up backup file
rm -f "${formula_file}.bak"

# Verify the changes
echo "Checking updated values:"
grep "sha256" "$formula_file"

# Verify updates were successful
if grep -q "version \"${VERSION}\"" Formula/grpc-client.rb; then
    echo "✅ Version updated to ${VERSION}"
else
    echo "❌ Failed to update version"
fi

# Verify SHA256 updates for each platform
for hash_var in \
    ARM64_TAHOE_SHA \
    ARM64_SEQUOIA_SHA \
    ARM64_SONOMA_SHA \
    ARM64_VENTURA_SHA \
    SONOMA_SHA \
    VENTURA_SHA \
    LINUX_AMD64_SHA \
    LINUX_ARM64_SHA; do
    hash="${!hash_var}"
    if [ -n "$hash" ] && grep -q "$hash" Formula/grpc-client.rb; then
        echo "✅ SHA256 hash verified: $hash"
    else
        echo "❌ Failed to verify SHA256 hash for $hash_var: $hash"
    fi
done

echo "✅ Updated Homebrew formula with new version and SHA256 hashes"

# Create formula from template
cp grpc-client.rb.template grpc-client.rb

# Update version and hashes in formula.rb
sed -i.bak -e "s/REPLACE_VERSION/${VERSION}/g" \
    -e "s/REPLACE_ARM64_TAHOE_SHA256/${ARM64_TAHOE_SHA}/g" \
    -e "s/REPLACE_ARM64_SEQUOIA_SHA256/${ARM64_SEQUOIA_SHA}/g" \
    -e "s/REPLACE_ARM64_SONOMA_SHA256/${ARM64_SONOMA_SHA}/g" \
    -e "s/REPLACE_ARM64_VENTURA_SHA256/${ARM64_VENTURA_SHA}/g" \
    -e "s/REPLACE_SONOMA_SHA256/${SONOMA_SHA}/g" \
    -e "s/REPLACE_VENTURA_SHA256/${VENTURA_SHA}/g" \
    -e "s/REPLACE_LINUX_AMD64_SHA256/${LINUX_AMD64_SHA}/g" \
    grpc-client.rb

# Show the updated SHA256 values for verification
echo ""
echo "📋 Updated Homebrew formula values:"
echo "  Version: v${VERSION}"
echo "  arm64_tahoe:   ${ARM64_TAHOE_SHA:-not built}"
echo "  arm64_sequoia: ${ARM64_SEQUOIA_SHA:-not built}"
echo "  arm64_sonoma:  ${ARM64_SONOMA_SHA:-not built}"
echo "  arm64_ventura: ${ARM64_VENTURA_SHA:-not built}"
echo "  sonoma:        ${SONOMA_SHA:-not built}"
echo "  ventura:       ${VENTURA_SHA:-not built}"
echo "  x86_64_linux:  ${LINUX_AMD64_SHA:-not built}"
echo "  windows:       ${WINDOWS_SHA:-not built}"

echo ""
echo "✅ Release v${VERSION} prepared successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Commit the changes:        git add . && git commit -m 'Release v${VERSION}'"
echo "  2. Create and push tag:       git tag v${VERSION} && git push origin v${VERSION}"
echo "  3. Create GitHub release:     Upload binaries from releases/v${VERSION}/"
echo "  4. Test Homebrew installation"
echo ""
echo "🔗 Binaries location: releases/v${VERSION}/"
echo ""
echo "📝 SHA256 Hashes Summary:"
echo "  ARM64 MacOS:"
echo "    • Tahoe:   ${ARM64_TAHOE_SHA:-not built}"
echo "    • Sequoia: ${ARM64_SEQUOIA_SHA:-not built}"
echo "    • Sonoma:  ${ARM64_SONOMA_SHA:-not built}"
echo "    • Ventura: ${ARM64_VENTURA_SHA:-not built}"
echo ""
echo "  Intel MacOS:"
echo "    • Sonoma:  ${SONOMA_SHA:-not built}"
echo "    • Ventura: ${VENTURA_SHA:-not built}"
echo ""
echo "  Linux Platforms:"
echo "    • AMD64: ${LINUX_AMD64_SHA:-not built}"
echo "    • ARM64: ${LINUX_ARM64_SHA:-not built}"
echo ""
echo "� Updated Versions:"
echo "  • package.json:      v${VERSION}"
echo "  • Homebrew formula: v${VERSION}"
echo ""
echo "✨ No Go installation required for end users!"
echo "🎉 Ready for release!"
