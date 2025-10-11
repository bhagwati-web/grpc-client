class Pulse < Formula
  desc "Modern API client supporting both gRPC and REST protocols with intuitive web interface"
  homepage "https://bhagwati-web.github.io/pulse/"
  lic  def post_install
    def post_install
    puts "\n\n\n================================================"
    puts "Pulse API Client installed successfully!"
    puts ""
    puts "Features included:"
    puts "  • gRPC & REST API testing"
    puts "  • Modern React web interface"
    puts "  • Request collections & sharing"
    puts "  • Server reflection support"
    puts "  • Dark mode & URL parameters"
    puts ""
    puts "🚀 Start server:    pulse-start"
    puts "🛑 Stop server:     pulse-stop"
    puts "📊 Check status:    pulse-status"
    puts "🎯 Direct run:      pulse"
    puts ""
    puts "Server will be available at: #{@@server_url}"
    puts "================================================"
    puts ""
    puts "💡 Run 'pulse-start' for background service"
    puts "💡 Run 'pulse' for foreground execution"
    puts ""
  end=========================================="
    puts "Pulse API Client installed successfully!"
    puts ""
    puts "Features included:"
    puts "  • gRPC & REST API testing"
    puts "  • Modern React web interface"
    puts "  • Request collections & sharing"
    puts "  • Server reflection support"
    puts "  • Dark mode & URL parameters"
    puts ""
    puts "🚀 Start server:    pulse-start"
    puts "🛑 Stop server:     pulse-stop"
    puts "📊 Check status:    pulse-status"
    puts "🎯 Direct run:      pulse"
    puts ""
    puts "Server will be available at: #{@@server_url}"
    puts "================================================"
    puts ""
    puts "💡 Run 'pulse-start' for background service"
    puts "💡 Run 'pulse' for foreground execution"
    puts ""
  end "0.0.5"
  @@repository = "https://github.com/bhagwati-web/pulse/releases/download/#{version}"
  @@server_port = "50051"
  @@server_url = "http://localhost:#{@@server_port}"

  on_macos do
    if Hardware::CPU.intel?
      url "#{@@repository}/pulse-darwin-amd64"
      sha256 "66c172422193a872d0ec57e5b260dd630b9dee347a6669626a9e7bb6ac63684d"
    else
      url "#{@@repository}/pulse-darwin-arm64"
      sha256 "1a1f7a755f685e7e15e8dbef6b83240c9dc13ee466b2af46b4f02940f5e6192a"
    end
  end

  on_linux do
    url "#{@@repository}/pulse-linux-amd64"
    sha256 "c448d0a83b737612f28abac05953c1eb343be0f58764e062928b884d4a404f78"
  end


  # Go binary has no external dependencies - works without Go installed!

  def install
    # Stop any running pulse processes before installation
    system "echo 'Checking for running Pulse processes...'"
    
    # Try to stop using the standard pulse-stop command if it exists
    if File.exist?("#{HOMEBREW_PREFIX}/bin/pulse-stop")
      system "#{HOMEBREW_PREFIX}/bin/pulse-stop 2>/dev/null || true"
    end
    
    # Kill any processes using the PID file
    if File.exist?(File.expand_path("~/.pulse.pid"))
      pid = File.read(File.expand_path("~/.pulse.pid")).strip
      system "kill #{pid} 2>/dev/null || true"
      system "rm -f ~/.pulse.pid 2>/dev/null || true"
    end
    
    # Kill any processes using the port as fallback
    system "lsof -t -i:#{@@server_port} 2>/dev/null | xargs kill -9 2>/dev/null || true"
    
    # Kill any pulse processes by name
    system "pkill -f pulse 2>/dev/null || true"
    
    system "echo 'Installing new Pulse API Client version...'"
    
    # Rename the downloaded binary to a standard name
    bin.install Dir["*"].first => "pulse"
    
    # Create convenience wrapper scripts
    
    # Create start script
    (bin/"pulse-start").write <<~EOS
      #!/bin/bash
      
      PID_FILE="$HOME/.pulse.pid"
      
      # Check if already running
      if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
          echo "✅ Pulse is already running (PID: $PID)"
          echo "🌐 Web UI: #{@@server_url}"
          exit 0
        else
          rm -f "$PID_FILE"
        fi
      fi
      
      # Check port availability
      if lsof -t -i:#{@@server_port} > /dev/null 2>&1; then
        echo "❌ Port #{@@server_port} is already in use"
        echo "💡 Run 'pulse-stop' to stop any existing Pulse processes"
        exit 1
      fi
      
      echo "🚀 Starting Pulse API Client..."
      
      # Start Pulse in background and save PID
      nohup #{bin}/pulse > /dev/null 2>&1 &
      echo $! > "$PID_FILE"
      
      # Wait a moment for startup
      sleep 2
      
      # Verify it started
      if kill -0 $(cat "$PID_FILE") 2>/dev/null && lsof -t -i:#{@@server_port} > /dev/null 2>&1; then
        echo "✅ Pulse started successfully!"
        echo "🌐 Web UI: #{@@server_url}"
        echo "📋 PID saved to: $PID_FILE"
      else
        echo "❌ Failed to start Pulse"
        rm -f "$PID_FILE"
        exit 1
      fi
    EOS
    
    # Create stop script
    (bin/"pulse-stop").write <<~EOS
      #!/bin/bash
      
      PID_FILE="$HOME/.pulse.pid"
      
      echo "🛑 Stopping Pulse API Client..."
      
      # Try to stop using PID file first
      if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
          kill "$PID"
          rm -f "$PID_FILE"
          echo "✅ Pulse stopped (PID: $PID)"
        else
          rm -f "$PID_FILE"
          echo "⚠️  PID file was stale, removed"
        fi
      fi
      
      # Kill any remaining processes on the port
      if lsof -t -i:#{@@server_port} > /dev/null 2>&1; then
        echo "🔍 Found processes still using port #{@@server_port}, terminating..."
        lsof -t -i:#{@@server_port} | xargs kill -9 2>/dev/null || true
      fi
      
      # Kill any pulse processes by name as fallback
      if pgrep -f "pulse" > /dev/null 2>&1; then
        echo "🔍 Found remaining pulse processes, terminating..."
        pkill -f "pulse" 2>/dev/null || true
      fi
      
      echo "✅ All Pulse processes stopped"
    EOS
    
    # Create status command
    (bin/"pulse-status").write <<~EOS
      #!/bin/bash
      
      PID_FILE="$HOME/.pulse.pid"
      
      echo "Checking Pulse API Client status..."
      
      # Check PID file
      if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
          echo "✅ Pulse is running (PID: $PID)"
        else
          echo "⚠️  PID file exists but process is dead, cleaning up..."
          rm -f "$PID_FILE"
        fi
      fi
      
      # Check if Pulse is running on port #{@@server_port}
      if lsof -t -i:#{@@server_port} > /dev/null 2>&1; then
        PORT_PID=$(lsof -t -i:#{@@server_port})
        echo "✅ Service is running on #{@@server_url} (PID: $PORT_PID)"
        echo "🌐 Web UI: #{@@server_url}"
      else
        echo "❌ Pulse is not running"
        echo "💡 Run 'pulse-start' to start the server"
      fi
    EOS
    
    # Make scripts executable
    chmod 0755, bin/"pulse-start"
    chmod 0755, bin/"pulse-stop" 
    chmod 0755, bin/"pulse-status"
  end
  
  def post_install
    puts "\n\n\n================================================"
    puts "Pulse API Client installed successfully!"
    puts ""
    puts "Features included:"
    puts "  • gRPC & REST API testing"
    puts "  • Modern React web interface"
    puts "  • Request collections & sharing"
    puts "  • Server reflection support"
    puts "  • Dark mode & URL parameters"
    puts ""
    puts "🚀 Start server:    pulse"
    puts "� Check status:    pulse-status"
    puts ""
    puts "Server will be available at: #{@@server_url}"
    puts "================================================"
    puts ""
    puts "💡 Run 'pulse' to start the API client server"
    puts ""
  end
end
