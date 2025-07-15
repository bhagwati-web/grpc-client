#!/bin/bash

# Validation script to check if React UI is properly integrated into Go binary

echo "🔍 Validating React UI integration..."

# Check if React build exists
if [ ! -d "web-ui/dist" ]; then
    echo "❌ React build not found. Run 'cd web-ui && npm run build' first."
    exit 1
fi

# Check if static files are copied to Go project
if [ ! -d "go-grpc-client/static" ]; then
    echo "❌ Go static directory not found."
    exit 1
fi

if [ ! -f "go-grpc-client/static/index.html" ]; then
    echo "❌ React index.html not found in Go static directory."
    exit 1
fi

if [ ! -d "go-grpc-client/static/assets" ]; then
    echo "❌ React assets not found in Go static directory."
    exit 1
fi

# Check if Go binary exists
cd go-grpc-client
if [ ! -f "grpc-client" ] && [ ! -f "grpc-client-darwin-amd64" ]; then
    echo "❌ Go binary not found. Run './build.sh' first."
    exit 1
fi

# Test if the integration works
echo "🧪 Testing integration..."

# Start the server briefly
if [ -f "grpc-client" ]; then
    BINARY="./grpc-client"
elif [ -f "grpc-client-darwin-amd64" ]; then
    BINARY="./grpc-client-darwin-amd64"
else
    echo "❌ No suitable binary found for testing"
    exit 1
fi

echo "🚀 Starting server for testing..."
$BINARY &
SERVER_PID=$!

# Give it time to start
sleep 3

# Test if React UI is served
echo "🌐 Testing React UI serving..."
if curl -s http://localhost:50051/ | grep -q "<title>GRPC Client</title>"; then
    echo "✅ React UI is being served correctly"
    UI_OK=true
else
    echo "❌ React UI is not being served correctly"
    UI_OK=false
fi

# Test if assets are served
echo "📦 Testing asset serving..."
if curl -s -I http://localhost:50051/assets/ | grep -q "200 OK"; then
    echo "✅ React assets are being served correctly"
    ASSETS_OK=true
else
    echo "❌ React assets are not being served correctly"
    ASSETS_OK=false
fi

# Test if API still works
echo "🔌 Testing API endpoints..."
if curl -s http://localhost:50051/collection/load | grep -q "\["; then
    echo "✅ API endpoints are working correctly"
    API_OK=true
else
    echo "❌ API endpoints are not working correctly"
    API_OK=false
fi

# Clean up
kill $SERVER_PID 2>/dev/null || true
sleep 1
lsof -ti:50051 | xargs kill -9 2>/dev/null || true

echo ""
echo "📋 Integration Validation Results:"
echo "================================="
if [ "$UI_OK" = true ]; then
    echo "✅ React UI Integration: PASS"
else
    echo "❌ React UI Integration: FAIL"
fi

if [ "$ASSETS_OK" = true ]; then
    echo "✅ Asset Serving: PASS"
else
    echo "❌ Asset Serving: FAIL"
fi

if [ "$API_OK" = true ]; then
    echo "✅ API Functionality: PASS"
else
    echo "❌ API Functionality: FAIL"
fi

if [ "$UI_OK" = true ] && [ "$ASSETS_OK" = true ] && [ "$API_OK" = true ]; then
    echo ""
    echo "🎉 All tests passed! React UI is fully integrated."
    echo "🚀 Ready for distribution!"
    exit 0
else
    echo ""
    echo "❌ Some tests failed. Please check the integration."
    exit 1
fi
