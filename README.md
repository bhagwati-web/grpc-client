# GRPC-client

GRPC-client is a tool similar to Postman, designed to interact with gRPC servers. It allows users to get gRPC reflections and responses from gRPC servers.

## Functionality

- **gRPC Reflection**: Fetches the gRPC reflection service and functions from the gRPC server.
- **gRPC Response**: Sends requests to the gRPC server and retrieves responses.

## Setup Process

1. **Clone the Repository**:
    ```sh
    git clone https://github.com/bhagwati-web/grpc-client.git
    cd GRPC-client
    ```

2. **Install Backend Dependencies**:

    It will need [`grpcurl`](https://formulae.brew.sh/formula/grpcurl) on your system. If not installed, you can install it with following command.
    ```sh
    brew install grpcurl
    ```

    Ensure you have java available in your system. 
    ```sh
    java -version
    ```
    Ensure you have Maven installed. Run the following command to install the backend dependencies:
    ```sh
    mvn install
    ```
3. **To run without customization**
    ```sh
    mvn clean install
    cd target
    java -jar grpc-client-0.0.1.jar
    ```
    Go to Step 7

4. **Install Frontend Dependencies**:
    Navigate to the `web-ui` directory and install the frontend dependencies using npm(in case you want some customization):
    ```sh
    cd web-ui
    npm install
    ```

5. **Build the Project**:
    Build the frontend and backend projects:
    ```sh
    mvn clean install
    ```

6. **Run the Application**:
    Start the backend server:
    ```sh
    mvn spring-boot:run
    ```

7. **Access the Application**:
    Open your browser and navigate to `http://localhost:50051` to access the application.

## Additional Information

- **Frontend**: The frontend is built using React, TypeScript, and Vite.
- **Backend**: The backend is built using Spring Boot and Kotlin.
- **Configuration**: Update the configuration files as needed to match your environment.

For more detailed information, refer to the individual documentation files in the respective directories.