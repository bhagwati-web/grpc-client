# Example Usage

This document pro### 2. Make a gRPC Call with Metadata

```bash
curl -X POST http://localhost:8080/grpc/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {
      "a": 10,
      "b": 20
    },
    "metaData": {
      "custom-header": "custom-value",
      "trace-id": "abc123",
      "client-id": "web-ui"
    }
  }'
```ow to use the Go gRPC client.

## Prerequisites

1. Install Go (1.21 or higher)
2. Build the application: `./build.sh` or `go build`
3. Start the server: `./grpc-client` or `go run main.go`

## Examples

### 1. Make a Simple gRPC Call

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {
      "a": 5,
      "b": 3
    }
  }'
```

**Expected Response:**
```json
{
  "sum": 8
}
```

### 2. Make a gRPC Call with Metadata

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {
      "a": 10,
      "b": 20
    },
    "metaData": {
      "custom-header": "custom-value",
      "trace-id": "abc123"
    }
  }'
```

### 3. String Concatenation Example

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Concat",
    "message": {
      "a": "Hello, ",
      "b": "World!"
    }
  }'
```

**Expected Response:**
```json
{
  "v": "Hello, World!"
}
```

### 4. Get Server Reflection Information

```bash
curl http://localhost:50051/metadata/grpcb.in:443
```

**Expected Response:**
```json
[
  {
    "serviceName": "addsvc.Add",
    "methods": [
      {
        "name": "Sum",
        "fullName": "addsvc.Add.Sum",
        "inputType": "addsvc.SumRequest",
        "outputType": "addsvc.SumReply",
        "isStreaming": false
      },
      {
        "name": "Concat",
        "fullName": "addsvc.Add.Concat",
        "inputType": "addsvc.ConcatRequest",
        "outputType": "addsvc.ConcatReply",
        "isStreaming": false
      }
    ]
  }
]
```

### 5. Get Specific Method Details

```bash
curl http://localhost:50051/metadata/grpcb.in:443/addsvc.Add/Sum
```

### 6. Save a Collection

```bash
curl -X POST http://localhost:50051/collection/save \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {
      "a": 100,
      "b": 200
    },
    "metaData": {
      "environment": "production",
      "client-id": "web-ui"
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Collection saved successfully. You can reuse this request later.",
  "status": "success"
}
```

### 7. Load All Collections

```bash
curl http://localhost:50051/collection/load
```

**Expected Response:**
```json
[
  {
    "title": "grpcb",
    "items": [
      {
        "message": {"a": 2, "b": 3},
        "metaData": null,
        "host": "grpcb.in:443",
        "service": "addsvc.Add",
        "serviceName": "Add",
        "requestName": "Sum"
      }
    ]
  }
]
```

### 8. Delete a Collection

```bash
curl -X DELETE http://localhost:50051/collection/delete \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "grpcb",
    "method": "addsvc.Add.Sum"
  }'
```

## Testing with Different Servers

### Local gRPC Server

If you have a local gRPC server running on port 9090:

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost:9090",
    "method": "YourService.YourMethod",
    "message": {
      "field1": "value1",
      "field2": 42
    }
  }'
```

### Secure gRPC Server

For servers requiring TLS (port 443):

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "your-secure-server.com:443",
    "method": "YourService.YourMethod",
    "message": {},
    "metaData": {
      "authorization": "Bearer your-jwt-token"
    }
  }'
```

## Error Handling Examples

### Invalid Host

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "invalid-host:9999",
    "method": "Test.Method",
    "message": {}
  }'
```

**Response:**
```json
{
  "error": "gRPC call failed: Failed to connect: ..."
}
```

### Method Not Found

```bash
curl -X POST http://localhost:50051/grpc/call \
  -H "Content-Type: application/json" \
  -d '{
    "host": "grpcb.in:443",
    "method": "NonExistent.Method",
    "message": {}
  }'
```

**Response:**
```json
{
  "error": "Method descriptor error: service 'NonExistent' not found. Available services: [...]"
}
```

## Health Check

The application doesn't have a dedicated health endpoint, but you can check if it's running:

```bash
curl http://localhost:50051/grpc/
```

**Response:**
```json
{
  "message": "Default endpoint for grpc"
}
```

## Integration with Frontend

This API is designed to work with the existing web UI. The endpoints maintain compatibility with the original Java implementation, so the existing frontend should work without changes.

### JavaScript Example

```javascript
// Make a gRPC call from JavaScript
async function makeGrpcCall() {
  const response = await fetch('http://localhost:50051/grpc/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      host: 'grpcb.in:443',
      method: 'addsvc.Add.Sum',
      message: { a: 5, b: 3 }
    })
  });
  
  const result = await response.json();
  console.log('Result:', result);
}
```

## Troubleshooting

### Connection Issues
- Verify the gRPC server is running and accessible
- Check firewall settings
- Ensure the correct port is specified

### Reflection Issues
- Verify the gRPC server has reflection enabled
- Check if the server supports the reflection API

### Performance
- Monitor memory usage: the Go version should use significantly less memory than the Java version
- Check response times: should be faster than the original Java implementation
