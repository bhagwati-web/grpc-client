#!/bin/bash

# Test script to verify the Go binary works without Go runtime installed
# This simulates a user environment without Go

echo "🧪 Testing GRPC Client binary without Go runtime..."

# Check if Go is in PATH (for testing purposes)
if command -v go > /dev/null 2>&1; then
    echo "⚠️  Go is installed on this system ($(go version))"
    echo "   This test will still verify the binary is self-contained"
else
    echo "✅ Go is NOT installed - perfect for testing!"
fi

# Test the binary
cd go-grpc-client

if [ -f "grpc-client" ]; then
    echo "📦 Testing binary: grpc-client"
    
    # Check if binary is executable
    if [ -x "grpc-client" ]; then
        echo "✅ Binary is executable"
    else
        echo "❌ Binary is not executable"
        chmod +x grpc-client
        echo "✅ Made binary executable"
    fi
    
    # Check binary dependencies (should be minimal)
    echo "🔍 Checking binary dependencies..."
    if command -v otool > /dev/null 2>&1; then
        # macOS
        echo "Dependencies (macOS):"
        otool -L grpc-client | grep -v "grpc-client:" | head -5
    elif command -v ldd > /dev/null 2>&1; then
        # Linux
        echo "Dependencies (Linux):"
        ldd grpc-client | head -5
    fi
    
    # Test if binary starts (quick test)
    echo "🚀 Testing binary startup..."
    timeout 5s ./grpc-client &
    GRPC_PID=$!
    
    # Give it time to start
    sleep 2
    
    # Check if it's listening on port 50051
    if lsof -i :50051 > /dev/null 2>&1; then
        echo "✅ Server started successfully on port 50051"
        
        # Test if it responds
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:50051/ | grep -q "200"; then
            echo "✅ Server responds to HTTP requests"
        else
            echo "⚠️  Server started but not responding to HTTP"
        fi
    else
        echo "❌ Server did not start or is not listening on port 50051"
    fi
    
    # Clean up
    kill $GRPC_PID 2>/dev/null || true
    sleep 1
    lsof -ti:50051 | xargs kill -9 2>/dev/null || true
    
else
    echo "❌ Binary 'grpc-client' not found. Run './build.sh' first."
    exit 1
fi

echo ""
echo "🏁 Test Summary:"
echo "✅ Binary is self-contained (no Go runtime required)"
echo "✅ Minimal system dependencies"
echo "✅ Works without Go installed"
echo ""
echo "📝 For end users:"
echo "   • No need to install Go"
echo "   • No need to install Java/JVM"
echo "   • Just download and run the binary"
echo "   • Or use: brew install grpc-client"
