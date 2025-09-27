class GrpcClient < Formula
  desc "Homebrew Package for a GRPC client to query the server with integrated React UI"
  homepage "https://bhagwati-web.github.io/grpc-client"
  url "https://bhagwati-web.github.io/grpc-client/grpcui/archive/refs/tags/v0.0.1.tar.gz"
  sha256 "7fa3039bfa6c06a688c1094177445f759c592be2f04574a234da7a88ab2d0efd"
  license "MIT"
  head "https://bhagwati-web.github.io/grpc-client/grpcui.git", branch: "master"

  livecheck do
    url :stable
    strategy :github_latest
  end

  bottle do
    # macOS ARM64 platforms
    sha256 cellar: :any_skip_relocation, arm64_tahoe:   "8c34780715736b0108b762e6a61c947e7582b91e62d8f87c0adc6eb866831f9e"
    sha256 cellar: :any_skip_relocation, arm64_sequoia: "af7d3b913708e3a317716a066fd495182d0ae1b74c95993f3920006896bef66c"
    sha256 cellar: :any_skip_relocation, arm64_sonoma:  "0e013d904a2037d632212fd8a0aa3c014e4b857117805c298f433b597d4c9952"
    sha256 cellar: :any_skip_relocation, arm64_ventura: "aff0201781b5e0799565d8a1e68b8b97de264c1ef94d82d86a4d387ae1610df8"
    # macOS Intel platforms
    sha256 cellar: :any_skip_relocation, sonoma:        "a4a41b206917a178088e0585af0028777acc729128d575e22da3c893c8224efe"
    sha256 cellar: :any_skip_relocation, ventura:       "524b80b69be678f0b121ae57981301b312ff9fc74b1f6c79ab99bc6c7aecf834"
    # Linux platforms (using Linux architecture naming)
    sha256 cellar: :any_skip_relocation, arm64_linux:   "c68f2a9248b6db4e78ce62e6501f708d5859481dbdb392ac8b4cbfb97865f35c"
    sha256 cellar: :any_skip_relocation, x86_64_linux:  "57863a61b85195aec4093999028cf10b9a0f413a15d49cdb9d6f644f2b745a8c"
  end

  # Go binary has no external dependencies - works without Go installed!
  @server_port = "50051"
  @server_url = "http://localhost:#{@server_port}"

  def install
    # Stop any running grpc-client processes before installation
    system "echo 'Checking for running GRPC Client processes...'"

    # Try to stop using the standard grpcstop command if it exists
    system "#{HOMEBREW_PREFIX}/bin/grpcstop 2>/dev/null || true" if File.exist?("#{HOMEBREW_PREFIX}/bin/grpcstop")

    # Kill any processes using the PID file
    if File.exist?(File.expand_path("~/.grpc-client.pid"))
      pid = File.read(File.expand_path("~/.grpc-client.pid")).strip
      system "kill #{pid} 2>/dev/null || true"
      system "rm -f ~/.grpc-client.pid 2>/dev/null || true"
    end

    # Kill any processes using the port as fallback
    system "lsof -t -i:#{@server_port} 2>/dev/null | xargs kill -9 2>/dev/null || true"

    # Kill any grpc-client processes by name
    system "pkill -f grpc-client 2>/dev/null || true"

    system "echo 'Installing new GRPC Client version...'"

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
      echo "Server is running on #{@server_url}"
      echo "React UI is available at #{@server_url}"
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
      if lsof -t -i:#{@server_port} > /dev/null 2>&1; then
        lsof -t -i:#{@server_port} | xargs kill -9
        echo "Killed any remaining processes on port #{@server_port}"
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
    puts "The server includes:"
    puts "  • gRPC client API"
    puts "  • Integrated React UI"
    puts "  • Collection management"
    puts "  • Server reflection"
    puts ""
    puts "🚀 Start server:    grpcstart"
    puts "🛑 Stop server:     grpcstop"
    puts ""
    puts "Server will be available at: #{@server_url}"
    puts "================================================"
    puts ""
    puts "🎉 Starting GRPC Client Server automatically..."
    puts ""

    # Automatically start the server after installation
    system "#{bin}/grpcstart"

    puts "\n\n"
  end
end