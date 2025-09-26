.PHONY: build run test clean docker-build docker-run deps fmt vet

# Variables
BINARY_NAME=grpc-client
DOCKER_IMAGE=grpc-client
PORT=50051

# Build the application
build:
	go build -o $(BINARY_NAME) .

# Run the application
run:
	go run main.go

# Build and run
build-run: build
	./$(BINARY_NAME)

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	go clean
	rm -f $(BINARY_NAME)

# Download dependencies
deps:
	go mod download
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Vet code
vet:
	go vet ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# Build for production (optimized)
build-prod:
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w -s' -o $(BINARY_NAME) .

# Build for multiple platforms
build-all:
	# Linux
	GOOS=linux GOARCH=amd64 go build -o $(BINARY_NAME)-linux-amd64 .
	# macOS
	GOOS=darwin GOARCH=amd64 go build -o $(BINARY_NAME)-darwin-amd64 .
	# Windows
	GOOS=windows GOARCH=amd64 go build -o $(BINARY_NAME)-windows-amd64.exe .

# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-run:
	docker run -p $(PORT):$(PORT) $(DOCKER_IMAGE)

docker-build-run: docker-build docker-run

# Development setup
dev-setup: deps fmt vet

# Check everything before commit
pre-commit: fmt vet test

# Install development tools
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Show help
help:
	@echo "Available commands:"
	@echo "  build       - Build the application"
	@echo "  run         - Run the application"
	@echo "  build-run   - Build and run the application"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  deps        - Download and tidy dependencies"
	@echo "  fmt         - Format code"
	@echo "  vet         - Vet code"
	@echo "  lint        - Lint code (requires golangci-lint)"
	@echo "  build-prod  - Build for production"
	@echo "  build-all   - Build for multiple platforms"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run  - Run Docker container"
	@echo "  docker-build-run - Build and run Docker container"
	@echo "  dev-setup   - Setup development environment"
	@echo "  pre-commit  - Run pre-commit checks"
	@echo "  install-tools - Install development tools"
	@echo "  help        - Show this help message"
