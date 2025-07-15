class GrpcClient < Formula
  desc "Homebrew Package for a GRPC client to query the server with integrated React UI"
  homepage "https://bhagwati-web.github.io/homebrew-grpc-client"
  
  version "2.1.0"
  @@server_port = "50051"
  @@server_url = "http://localhost:#{@@server_port}"

  on_macos do
    if Hardware::CPU.intel?
      url "https://github.com/bhagwati-web/grpc-client/releases/download/v#{version}/grpc-client-darwin-amd64"
      sha256 "UPDATE_INTEL_SHA256" # Update when binary is built
    else
      url "https://github.com/bhagwati-web/grpc-client/releases/download/v#{version}/grpc-client-darwin-arm64"
      sha256 "UPDATE_ARM64_SHA256" # Update when binary is built
    end
  end

  on_linux do
    url "https://github.com/bhagwati-web/grpc-client/releases/download/v#{version}/grpc-client-linux-amd64"
    sha256 "UPDATE_LINUX_SHA256" # Update when binary is built
  end

  license "MIT"

  # Go binary has no external dependencies - works without Go installed!

  def install
    # Rename the downloaded binary to a standard name
    bin.install Dir["*"].first => "grpc-client"
    
    (bin/"grpcstart").write <<~EOS
      #!/bin/bash

      echo "Starting GRPC Client Server with integrated React UI..."
      
      # Start the GRPC client in background
      nohup #{bin}/grpc-client > /dev/null 2>&1 &
      GRPC_PID=$!
      
      # Save PID for later stopping
      echo $GRPC_PID > ~/.grpc-client.pid
      
      # Allow time for the server to start
      sleep 3

      echo "GRPC Client Server started successfully!"
      echo "Server is running on #{@@server_url}"
      echo "React UI is available at #{@@server_url}"
      echo "Use 'grpcstop' to stop the server"

      # Open the default browser with the server URL
      if command -v xdg-open > /dev/null; then
        xdg-open "#{@@server_url}"
      elif command -v open > /dev/null; then
        open "#{@@server_url}"
      else
        echo "Please open #{@@server_url} in your browser"
      fi
    EOS
    (bin/"grpcstop").write <<~EOS
      #!/bin/bash
      
      echo "Stopping GRPC Client Server..."
      
      # Try to kill using saved PID first
      if [ -f ~/.grpc-client.pid ]; then
        PID=$(cat ~/.grpc-client.pid)
        if ps -p $PID > /dev/null 2>&1; then
          kill $PID
          echo "Stopped GRPC Client Server (PID: $PID)"
        fi
        rm -f ~/.grpc-client.pid
      fi
      
      # Fallback: kill any process using the port
      if lsof -t -i:#{@@server_port} > /dev/null 2>&1; then
        lsof -t -i:#{@@server_port} | xargs kill -9
        echo "Killed any remaining processes on port #{@@server_port}"
      fi
      
      echo "GRPC Client Server stopped successfully!"
    EOS
    
    # Make scripts executable
    chmod 0755, bin/"grpcstart"
    chmod 0755, bin/"grpcstop"
  end
  
  def post_install
    puts "\n\n\n================================================"
    puts "GRPC Client installed successfully!"
    puts ""
    puts "🚀 Start server:    grpcstart"
    puts "🛑 Stop server:     grpcstop"
    puts ""
    puts "The server includes:"
    puts "  • gRPC client API"
    puts "  • Integrated React UI"
    puts "  • Collection management"
    puts "  • Server reflection"
    puts ""
    puts "Server will be available at: #{@@server_url}"
    puts "================================================\n\n\n"
  end
end