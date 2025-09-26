package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"grpc-client/models"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/dynamic"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	reflectpb "google.golang.org/grpc/reflection/grpc_reflection_v1alpha"
)

type GrpcController struct{}

func NewGrpcController() *GrpcController {
	return &GrpcController{}
}

func (gc *GrpcController) DefaultEndpoint(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Default endpoint for grpc"})
}

func (gc *GrpcController) MakeGrpcCall(c *gin.Context) {
	var grpcRequest models.GrpcRequest
	if err := c.ShouldBindJSON(&grpcRequest); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	log.Printf("Making gRPC call to %s for method %s", grpcRequest.Host, grpcRequest.Method)

	// Create gRPC connection
	conn, err := gc.createConnection(grpcRequest.Host)
	if err != nil {
		log.Printf("Error creating connection: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("Failed to connect: %v", err)})
		return
	}
	defer conn.Close()

	// Execute gRPC call
	result, err := gc.executeGrpcCall(conn, grpcRequest, c.Request.Header)
	if err != nil {
		log.Printf("Error executing gRPC call: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("gRPC call failed: %v", err)})
		return
	}

	log.Printf("gRPC call completed successfully")
	c.JSON(http.StatusOK, result)
}

func (gc *GrpcController) createConnection(host string) (*grpc.ClientConn, error) {
	return CreateFlexibleConnection(host)
}

func (gc *GrpcController) executeGrpcCall(conn *grpc.ClientConn, grpcRequest models.GrpcRequest, headers http.Header) (interface{}, error) {
	// Get method descriptor using reflection
	methodDesc, err := gc.getMethodDescriptor(conn, grpcRequest.Method)
	if err != nil {
		return nil, fmt.Errorf("method descriptor error: %v", err)
	}

	// Parse request message
	requestMsg, err := gc.parseRequestMessage(methodDesc.GetInputType(), grpcRequest.Message)
	if err != nil {
		return nil, fmt.Errorf("failed to parse request message: %v", err)
	}

	// Create metadata
	md := gc.createMetadata(grpcRequest, headers)

	// Create context with metadata
	ctx := metadata.NewOutgoingContext(context.Background(), md)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Make the call
	return gc.makeUnaryCall(ctx, conn, methodDesc, requestMsg)
}

func (gc *GrpcController) getMethodDescriptor(conn *grpc.ClientConn, methodName string) (*desc.MethodDescriptor, error) {
	// Parse method name: "addsvc.Add.Sum" -> service="addsvc.Add", method="Sum"
	parts := strings.Split(methodName, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid method name format: %s", methodName)
	}

	serviceName := strings.Join(parts[:len(parts)-1], ".")
	methodShortName := parts[len(parts)-1]

	log.Printf("Looking for service: '%s', method: '%s'", serviceName, methodShortName)

	// Create reflection client
	refClient := grpcreflect.NewClient(context.Background(), reflectpb.NewServerReflectionClient(conn))
	defer refClient.Reset()

	// List all services
	services, err := refClient.ListServices()
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %v", err)
	}

	log.Printf("Available services: %v", services)

	// Find matching service name
	actualServiceName := gc.findMatchingServiceName(services, serviceName)
	if actualServiceName == "" {
		return nil, fmt.Errorf("service '%s' not found. Available services: %v", serviceName, services)
	}

	log.Printf("Using actual service name: '%s'", actualServiceName)

	// Get service descriptor
	serviceDesc, err := refClient.ResolveService(actualServiceName)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve service '%s': %v", actualServiceName, err)
	}

	// Find method in service
	for _, method := range serviceDesc.GetMethods() {
		if strings.EqualFold(method.GetName(), methodShortName) {
			log.Printf("Found method: %s", method.GetFullyQualifiedName())
			return method, nil
		}
	}

	return nil, fmt.Errorf("method '%s' not found in service '%s'", methodShortName, actualServiceName)
}

func (gc *GrpcController) findMatchingServiceName(availableServices []string, requestedServiceName string) string {
	// Try exact match first
	for _, service := range availableServices {
		if service == requestedServiceName {
			return service
		}
	}

	// Try matching just the service name part (e.g., "Add" from "addsvc.Add")
	shortServiceName := requestedServiceName
	if idx := strings.LastIndex(requestedServiceName, "."); idx != -1 {
		shortServiceName = requestedServiceName[idx+1:]
	}

	for _, service := range availableServices {
		if service == shortServiceName {
			return service
		}
	}

	// Try case-insensitive match
	for _, service := range availableServices {
		if strings.EqualFold(service, requestedServiceName) || strings.EqualFold(service, shortServiceName) {
			return service
		}
	}

	// Try partial match (contains)
	for _, service := range availableServices {
		if strings.Contains(strings.ToLower(service), strings.ToLower(shortServiceName)) ||
			strings.Contains(strings.ToLower(shortServiceName), strings.ToLower(service)) {
			return service
		}
	}

	return ""
}

func (gc *GrpcController) parseRequestMessage(msgDesc *desc.MessageDescriptor, message interface{}) (*dynamic.Message, error) {
	if message == nil {
		message = make(map[string]interface{})
	}

	// Convert message to JSON and back to ensure proper format
	jsonBytes, err := json.Marshal(message)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal message: %v", err)
	}

	// Create dynamic message
	msg := dynamic.NewMessage(msgDesc)
	if err := msg.UnmarshalJSON(jsonBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal message: %v", err)
	}

	return msg, nil
}

func (gc *GrpcController) createMetadata(grpcRequest models.GrpcRequest, headers http.Header) metadata.MD {
	md := metadata.New(nil)

	// Add metadata from request - now using simple flat object format
	if grpcRequest.MetaData != nil {
		for key, value := range grpcRequest.MetaData {
			if value != "" { // Only add non-empty values
				md.Append(strings.ToLower(key), value)
			}
		}
	}

	// Add authorization header if present and not already in metadata
	if authHeader := headers.Get("Authorization"); authHeader != "" {
		if _, exists := md["authorization"]; !exists {
			md.Append("authorization", authHeader)
		}
	}

	return md
}

func (gc *GrpcController) makeUnaryCall(ctx context.Context, conn *grpc.ClientConn, methodDesc *desc.MethodDescriptor, request *dynamic.Message) (interface{}, error) {
	log.Printf("Making gRPC unary call to method: %s", methodDesc.GetFullyQualifiedName())

	// Create dynamic stub
	stub := grpcreflect.NewClient(ctx, reflectpb.NewServerReflectionClient(conn))
	defer stub.Reset()

	// Prepare method invocation
	fullMethodName := fmt.Sprintf("/%s/%s", methodDesc.GetService().GetFullyQualifiedName(), methodDesc.GetName())

	// Create response message
	responseMsg := dynamic.NewMessage(methodDesc.GetOutputType())

	// Invoke method
	err := conn.Invoke(ctx, fullMethodName, request, responseMsg)
	if err != nil {
		return nil, fmt.Errorf("gRPC call failed: %v", err)
	}

	// Convert response to JSON
	jsonBytes, err := responseMsg.MarshalJSON()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %v", err)
	}

	// Parse JSON to interface{}
	var result interface{}
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response JSON: %v", err)
	}

	return result, nil
}
