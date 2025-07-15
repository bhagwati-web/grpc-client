# GRPC Client - Go Edition

A powerful gRPC client with integrated React UI, migrated from Java Spring Boot to Go for better performance and easier deployment.

## Features

✅ **gRPC Client**: Test and interact with gRPC services  
✅ **Server Reflection**: Automatic service discovery  
✅ **Collection Management**: Save and organize requests  
✅ **React Web UI**: Modern, responsive interface  
✅ **Single Binary**: No dependencies, easy deployment  
✅ **Cross-Platform**: Works on macOS, Linux, and Windows  
✅ **Homebrew Support**: Easy installation on macOS  

## Quick Start

### Option 1: Homebrew (macOS)

```bash
# Install via Homebrew
brew tap bhagwati-web/grpc-client
brew install grpc-client

# Start the server
grpcstart

# Stop the server  
grpcstop
```

### Option 2: Direct Binary

1. Download the binary for your platform from [Releases](https://github.com/bhagwati-web/grpc-client/releases)
2. Make it executable: `chmod +x grpc-client`
3. Run: `./grpc-client`
4. Open browser to: `http://localhost:50051`

## API Endpoints

- **Web UI**: `http://localhost:50051/`
- **gRPC Call**: `POST /grpc/call`
- **Collections**: `GET /collection/load`
- **Reflection**: `GET /metadata/{host}`

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/bhagwati-web/grpc-client.git
cd grpc-client

# Option 1: Use the build script (recommended)
./build.sh

# Option 2: Manual build
# 1. Build React UI
cd web-ui
npm install
npm run build

# 2. Copy to Go static directory
cd ..
cp -r web-ui/dist/* go-grpc-client/static/

# 3. Build Go binary
cd go-grpc-client
go build -o grpc-client main.go

# 4. Run
./grpc-client
```

### Validating the Build

```bash
# Test if React UI is properly integrated
./validate-integration.sh
```

### Creating Release Binaries

```bash
# Use the build script
./build.sh
```

This creates binaries for all platforms and calculates SHA256 hashes for distribution.

## Migration from Java

This project was successfully migrated from Java Spring Boot to Go, providing:

- **90% smaller binary size**
- **Faster startup time**
- **Lower memory usage**
- **No JVM dependency**
- **Better cross-platform support**

## Architecture

```
go-grpc-client/
├── main.go              # Go server with Gin framework
├── controllers/         # API controllers
├── models/              # Data models
├── middleware/          # CORS and other middleware
├── static/              # React UI build files
└── constants/           # Configuration constants
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
