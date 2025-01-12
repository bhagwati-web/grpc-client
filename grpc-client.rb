class GrpcClient < Formula
  desc "A GRPC client to query the server"
  homepage "https://bhagwati-web.github.io/homebrew-grpc-client"
  url "https://github.com/bhagwati-web/grpc-client/releases/download/0.0.2/grpc-client-0.0.2.jar"
  sha256 "445b375ebe3eb92f19322234dd3ab0fa0bbe6e2ca87dcaf757f7979c8c398be6"
  license "MIT"

  depends_on "openjdk@17"
  depends_on "grpcurl"

  def install
    libexec.install "grpc-client-0.0.2.jar"
    (bin/"grpc-start").write <<~EOS
      #!/bin/bash
      exec java -jar #{libexec}/grpc-client-0.0.2.jar start "$@"
    EOS
    (bin/"grpc-stop").write <<~EOS
      #!/bin/bash
      exec lsof -t -i:50051 | xargs kill -9 "$@"
    EOS
  end
  
  def post_install
    system "echo", "================================================"
    system "echo", "================================================"
    system "echo", "GRPC Client installed. Use 'grpc-start' and 'grpc-stop' to manage the server. It will be available on http://localhost:50051"
    system "echo", "================================================"
    system "echo", "================================================"
  end
end
