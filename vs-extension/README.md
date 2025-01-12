# GRPC-client

GRPC-client is a tool similar to Postman, designed to interact with gRPC servers. It allows users to get gRPC reflections and responses from gRPC servers.

## Functionality

- **gRPC Reflection**: Fetches the gRPC reflection service and functions from the gRPC server.
- **gRPC Response**: Sends requests to the gRPC server and retrieves responses.

## Setup Process

1. **Install Backend Dependencies**:
    It will need [`grpcurl`](https://formulae.brew.sh/formula/grpcurl) on your system. If not install you can install it with following command.
    ```sh
    brew install grpcurl
    ```

    Ensure you have java available in your system. Nice, if you have minimum version 17 or later available in your system.
    ```sh
    java -version
    ```

7. **Access the Application outside vscode**:
    
    Open your browser and navigate to `http://localhost:50051` to access the application.

## Additional Information

- **Frontend**: The frontend is built using React, TypeScript, and Vite.
- **Backend**: The backend is built using Spring Boot and Kotlin.
- **Configuration**: Update the configuration files as needed to match your environment.

For more detailed information, refer to the individual documentation files in the respective directories.