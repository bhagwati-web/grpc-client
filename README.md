# Pulse - API Client

Pulse is a modern API client that supports both gRPC and REST protocols. It provides a comprehensive testing environment with reflection support, collection management, and an intuitive web interface.

## Features

✅ **Dual Protocol Support**: Test both gRPC and REST APIs in one tool  
✅ **Server Reflection**: Automatic gRPC service discovery  
✅ **Request Builder**: GUI request builder for both protocols  
✅ **Sample Generation**: Auto-generate sample requests from proto definitions  
✅ **Collection Management**: Save, organize, and share API requests  
✅ **Modern Web UI**: Responsive interface with dark mode support  
✅ **URL Parameters**: Deep linking to specific requests  
✅ **Single Binary**: No dependencies, easy deployment  
✅ **Cross-Platform**: Works on macOS, Linux, and Windows  

<img width="1511" height="811" alt="image" src="https://github.com/user-attachments/assets/fa6440fe-8a8f-4528-a36f-e119463a89b7" />


## Quick Start

### Option 1: Homebrew (macOS)

```bash
# Install via Homebrew
brew tap bhagwati-web/pulse
brew install pulse

# Start the server(terminal)
pulse

# The binary runs on port 50051 by default
# Open browser to: http://localhost:50051
```

### Option 2: Direct Binary

1. Download the binary for your platform from [Releases](https://github.com/bhagwati-web/pulse/releases)
2. Make it executable: `chmod +x pulse-darwin-amd64` (or your platform binary)
3. Run: `./pulse-darwin-amd64`
4. Open browser to: `http://localhost:50051`

## UI Features Guide

The web interface provides several key features to help you work with gRPC services:

### Main Sections
- **Server Connection** - Connect to gRPC servers and view available services
- **Request Builder** - Construct and send gRPC requests
- **Response Viewer** - View responses with syntax highlighting
- **Collections** - Save and manage frequently used requests

### Key Features
1. **Sample Request Generation**: Automatically generates sample requests based on method definitions
2. **GUI Request Builder**: Visual interface for constructing gRPC requests with field validation
3. **Syntax Highlighting**: Both request and response data are syntax-highlighted
4. **Request History**: Access your recent requests from the history panel
5. **Dark/Light Mode**: Toggle between themes for comfortable viewing
6. **Error Details**: Clear error messages with troubleshooting suggestions

### Making Your First gRPC Call

Once installed, follow these steps to make your first gRPC call:

1. Open `http://localhost:50051` in your browser
2. In the server input field, enter a public gRPC server (e.g., `grpcb.in:443`)
3. Click "Connect" to fetch available services
4. Select a service and method from the dropdown (e.g., `addsvc.Add.Sum`)
5. Enter the request message in JSON format:
   ```json
   {
     "a": 10,
     "b": 20
   }
   ```
6. Click "Send Request" to see the response

The UI will display the response and any metadata returned by the server.

## API Endpoints

### gRPC Endpoints
- `GET /grpc` - Default endpoint
- `POST /grpc/call` - Execute a gRPC call

### Reflection/Metadata Endpoints
- `GET /metadata` - Default endpoint
- `GET /metadata/:host` - Get reflection details for a gRPC server
- `GET /metadata/:host/:service/:function` - Get specific service function details

### Workspace & Collection Endpoints
- `GET /collection/workspace` - Load complete workspace
- `GET /collection/workspace/export` - Export workspace with timestamp
- `POST /collection/workspace/import` - Import workspace backup
- `POST /collection/collections` - Create new collection
- `PUT /collection/collections/:id` - Update collection (rename)
- `DELETE /collection/collections/:id` - Delete collection
- `POST /collection/requests` - Save request to collection
- `PUT /collection/requests/:id` - Update existing request
- `DELETE /collection/requests/:id` - Delete request

## Installation and Setup

### Prerequisites

#### For Running the Application
- No special requirements for using the pre-built binary
- For Homebrew installation on macOS: Homebrew package manager

#### For Development
- Go 1.21 or higher
- Git
- Node.js 18+ and npm (for UI development)
- Make (optional, for using Makefile commands)

### Clone and Build
```bash
cd web-api
go mod tidy
go build -o pulse .
```

### Run the Application
```bash
./pulse
```

The server will start on port 50051 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3000 ./pulse
```

## Configuration

### Environment Variables
- `PORT` - Server port (default: 50051)
- `GIN_MODE` - Gin mode (debug, release, test)
- `GRPC_GO_LOG_VERBOSITY_LEVEL` - Log verbosity (0-99)
- `GRPC_GO_LOG_SEVERITY_LEVEL` - Log severity (INFO, WARNING, ERROR)
- `GRPC_TRACE` - Enable specific gRPC subsystem logging
- `COLLECTION_PATH` - Custom path for storing collections
- `MAX_RECEIVE_MESSAGE_LENGTH` - Maximum message size (default: 4MB)
- `ENABLE_CORS` - Enable CORS for cross-origin requests (true/false)

### Command Line Flags
```bash
./pulse \
  --port=3000 \
  --collection-path=/custom/path \
  --tls-cert=/path/to/cert.pem \
  --tls-key=/path/to/key.pem \
  --max-message-size=8388608
```

### Configuration File
Create `config.yaml` in the same directory as the binary:

```yaml
server:
  port: 50051
  host: "0.0.0.0"
  cors: true
  
tls:
  enabled: false
  cert_file: ""
  key_file: ""

storage:
  collection_path: "~/.pulse"
  max_collections: 1000

logging:
  level: "info"
  format: "json"
```

## Request Examples

### Make a gRPC Call
```bash
# Request
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {"a": 2, "b": 3},
    "metaData": [{"key": "value"}]
  }'

# Response
{
  "success": true,
  "response": {
    "sum": 5
  },
  "error": null,
  "metadata": {
    "content-type": ["application/grpc"]
  }
}
```

### Get Server Reflection Data
```bash
# Request
curl http://localhost:50051/metadata/grpcb.in:443

# Response
{
  "services": [
    {
      "name": "addsvc.Add",
      "methods": [
        {
          "name": "Sum",
          "inputType": "AddRequest",
          "outputType": "AddResponse"
        }
      ]
    }
  ],
  "error": null
}
```

### Workspace Management

#### Load Workspace
```bash
curl http://localhost:50051/collection/workspace
```

#### Create New Collection
```bash
curl -X POST http://localhost:50051/collection/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Tests",
    "description": "Collection for testing my API"
  }'
```

#### Export Workspace (with timestamp)
```bash
curl http://localhost:50051/collection/workspace/export > workspace_backup.json
```

#### Import Workspace
```bash
curl -X POST http://localhost:50051/collection/workspace/import \
  -H "Content-Type: application/json" \
  -d @workspace_backup.json
```

## Advanced Usage Examples

### Server Streaming
```json
{
  "host": "grpcb.in:443",
  "method": "streamService.Stream.Numbers",
  "message": {"start": 1, "end": 10},
  "streaming": true
}
```

### Client Streaming
```json
{
  "host": "grpcb.in:443",
  "method": "streamService.Stream.Sum",
  "messages": [
    {"number": 1},
    {"number": 2},
    {"number": 3}
  ],
  "clientStreaming": true
}
```

### Bidirectional Streaming
```json
{
  "host": "grpcb.in:443",
  "method": "chatService.Chat.Connect",
  "messages": [
    {"message": "Hello"},
    {"message": "How are you?"}
  ],
  "bidirectional": true
}
```

### Error Handling
```json
{
  "host": "grpcb.in:443",
  "method": "errorService.Error.Trigger",
  "message": {"code": "NOT_FOUND"},
  "timeout": 5000,
  "retry": {
    "maxAttempts": 3,
    "initialBackoff": 1000
  }
}
```

### Working with Deadlines
```json
{
  "host": "grpcb.in:443",
  "method": "service.Method.Call",
  "message": {"key": "value"},
  "deadline": 30000  // 30 seconds
}
```

## Feature Comparison

Comparison with other popular gRPC clients:

| Feature                    | gRPC Client | Postman | BloomRPC | gRPCurl | gRPCui |
|---------------------------|-------------|---------|----------|---------|---------|
| Server Reflection         | ✅         | ✅      | ✅       | ✅      | ✅      |
| Cross-Platform           | ✅         | ✅      | ✅       | ✅      | ✅      |
| Web Interface             | ✅         | ✅      | ✅       | ❌      | ✅      |
| Open Source              | ✅         | ❌      | ✅       | ✅      | ✅      |
| Streaming Support         | ✅         | ❌      | ✅       | ✅      | ✅      |
| Collections/History       | ✅         | ✅      | ❌       | ❌      | ❌      |
| Sample Request Generation | ✅         | ✅       | ❌       | ❌      | ❌      |
| GUI Request Builder      | ✅         | ❌      | ❌       | ❌      | ✅      |
| No Installation Required | ✅         | ❌      | ❌       | ❌      | ❌      |

### Why Choose Pulse?

1. **Easy to Use**: Web-based interface with intuitive controls
2. **No Dependencies**: Single binary deployment
3. **Full Feature Set**: Supports all gRPC operations
4. **Developer Friendly**: Built-in debugging tools
5. **Cross-Platform**: Works on all major operating systems

# Key Dependencies

- **Gin**: Web framework for HTTP routing
- **grpc-go**: Official gRPC Go library
- **protoreflect**: gRPC reflection client library
- **jhump/protoreflect**: Enhanced protobuf reflection utilities

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/bhagwati-web/pulse.git
cd pulse

# Option 1: Use the build script (recommended)
./build.sh

# Option 2: Manual build
# 1. Build React UI
cd web-ui
npm install
npm run build

# 2. Copy to Go static directory
cd ..
cp -r web-ui/dist/* web-api/static/

# 3. Build Go binary
cd web-api
go build -o pulse main.go

# 4. Run
./pulse
```

## Docker Support

Build and run with Docker:

```bash
docker build -t pulse .
docker run -p 50051:50051 pulse
```

## Security and Authentication

### TLS/SSL Support
The client supports both secure (TLS) and insecure gRPC connections:


### Authentication Methods
1. **Basic Authentication**
   ```json
   {
     "metaData":
      {
        "authorization": "Basic base64(username:password)"
      }
   }
   ```

2. **Bearer Token**
   ```json
   {
     "metaData": 
    {
      "authorization": "Bearer your-token-here"
    }
   }
   ```

3. **Custom Headers**
   ```json
   {
     "metaData": {
       "x-api-key": "your-api-key",
       "custom-header": "custom-value"
       }
     ]
   }
   ```

### Security Best Practices
- Store sensitive metadata in collections with restricted permissions
- This tool will run on local system and there are no data will be catured and sent to any third party application servers or cloud.
- Enable TLS for secure communication between your machine and grpc service
- Regularly update the client to get security patches

## Troubleshooting

### Common Issues

1. **Cannot connect to gRPC server**
   - Check if the server address is correct and includes the port
   - Verify the server is running and accessible
   - Check if TLS is required (use https:// prefix if needed)

2. **"Failed to load reflection info" error**
   - Verify the gRPC server has reflection enabled
   - Check if the server requires authentication
   - Try using a known public gRPC server (like grpcb.in:443) to test

3. **UI not loading**
   - Clear browser cache and reload
   - Check if the correct port is being used
   - Verify no other service is using port 50051

4. **Permission denied when running binary**
   - Run `chmod +x pulse-darwin-amd64` (or your platform binary) to make it executable
   - On macOS, you might need to allow the application in Security & Privacy settings

### Getting Help
- Open an issue on GitHub for bug reports
- Check existing issues for similar problems
- Include your OS version and installation method when reporting issues


### Debug Mode
Run the server in debug mode:
```bash
GIN_MODE=debug ./pulse
```

### Network Debugging
1. Use `tcpdump` to capture gRPC traffic:
   ```bash
   tcpdump -i lo0 port 50051 -w grpc.pcap
   ```

2. Analyze with Wireshark:
   - Install gRPC dissector
   - Import the captured file
   - Filter: `grpc`

### Common Debugging Techniques
1. **Request/Response Inspection**
   ```bash
   # Enable detailed logging
   ./pulse --debug
   ```

2. **Memory Profiling**
   ```bash
   # Enable pprof endpoint
   ./pulse --pprof
   
   # Analyze memory usage
   go tool pprof http://localhost:50051/debug/pprof/heap
   ```

3. **Performance Tracing**
   ```bash
   # Enable tracing
   ./pulse --trace
   
   # View traces at
   http://localhost:50051/debug/traces
   ```

### Log File Locations
- Application logs: `/var/log/pulse/app.log`
- Error logs: `/var/log/pulse/error.log`
- Access logs: `/var/log/pulse/access.log`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
