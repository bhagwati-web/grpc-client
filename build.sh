#!/bin/bash

# Build script for GRPC Client Go binary
# This script builds the Go binary with embedded static files

set -e

# Build Go binary
echo "🐹 Building Go binary..."

# Change to the Go project directory
cd go-grpc-client

# Clean any existing binaries
echo "🧹 Cleaning existing binaries..."
rm -f grpc-client grpc-client-*

# Use output name from environment variable or default
OUTPUT="${OUTPUT_NAME:-grpc-client}"
echo "📦 Building binary: $OUTPUT"

# Ensure output directory exists
OUTPUT_DIR=$(dirname "$OUTPUT")
mkdir -p "$OUTPUT_DIR"

# Build the binary
go build -ldflags="-s -w" -o "$OUTPUT" main.go

if [ $? -eq 0 ]; then
    echo "✅ Successfully built: $OUTPUT"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
