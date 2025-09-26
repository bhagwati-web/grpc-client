# gRPC Client - Go Implementation

This is a Golang implementation of the gRPC client application. It provides a REST API for making gRPC calls with reflection support and collection management.

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

### gRPC Endpoints
- `GET /grpc` - Default endpoint
- `POST /grpc/call` - Execute a gRPC call

### Reflection/Metadata Endpoints
- `GET /metadata` - Default endpoint
- `GET /metadata/:host` - Get reflection details for a gRPC server
- `GET /metadata/:host/:service/:function` - Get specific service function details

### Collection Endpoints
- `GET /collection/load` - Load all saved collections
- `POST /collection/save` - Save a new collection
- `DELETE /collection/delete` - Delete a collection

## Installation and Setup

### Prerequisites
- Go 1.21 or higher
- Git

### Clone and Build
```bash
cd go-grpc-client
go mod tidy
go build -o grpc-client .
```

### Run the Application
```bash
./grpc-client
```

The server will start on port 50051 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3000 ./grpc-client
```

### Environment Variables
- `PORT` - Server port (default: 50051)
- `GIN_MODE` - Gin mode (debug, release, test)

## Request Examples

### Make a gRPC Call
```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {"a": 2, "b": 3},
    "metaData": [{"key": "value"}]
  }'
```

### Get Server Reflection Data
```bash
curl http://localhost:50051/metadata/grpcb.in:443
```

### Save a Collection
```bash
curl -X POST http://localhost:50051/collection/save \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {"a": 2, "b": 3},
    "metaData": [{"authorization": "Bearer token"}]
  }'
```

### Load Collections
```bash
curl http://localhost:50051/collection/load
```

## Project Structure

```
go-grpc-client/
├── main.go                 # Application entry point
├── go.mod                  # Go module file
├── controllers/            # HTTP request handlers
│   ├── grpc_controller.go      # gRPC call handling
│   ├── reflection_controller.go # Server reflection
│   └── collection_controller.go # Collection management
├── models/                 # Data models
│   └── models.go
├── constants/              # Application constants
│   └── constants.go
└── middleware/             # HTTP middleware
    └── cors.go
```

## Key Dependencies

- **Gin**: Web framework for HTTP routing
- **grpc-go**: Official gRPC Go library
- **protoreflect**: gRPC reflection client library
- **jhump/protoreflect**: Enhanced protobuf reflection utilities

## Migration Notes

This Go implementation maintains API compatibility with the original Java Spring Boot version:

- Same endpoint paths and HTTP methods
- Same request/response formats
- Same collection storage format (JSON files in `~/.grpc-client/`)
- Same sample data structure
- Same error handling patterns

### Key Differences from Java Version:
1. **Performance**: Go implementation is generally faster and uses less memory
2. **Dependencies**: Fewer external dependencies required
3. **Deployment**: Single binary deployment (no JVM required)
4. **Error Handling**: Go-style error handling instead of exceptions
5. **Concurrency**: Native goroutines for better concurrent request handling
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

## Docker Support

Build and run with Docker:

```bash
docker build -t grpc-client .
docker run -p 50051:50051 grpc-client
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
