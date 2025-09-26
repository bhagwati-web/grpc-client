package controllers

import (
	"context"
	"fmt"
	"grpc-client/models"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
	reflectpb "google.golang.org/grpc/reflection/grpc_reflection_v1alpha"
	"google.golang.org/protobuf/types/descriptorpb"
)

type ReflectionController struct {
	cache    map[string]CachedReflectionData
	cacheMux sync.RWMutex
}

type CachedReflectionData struct {
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

func NewReflectionController() *ReflectionController {
	return &ReflectionController{
		cache: make(map[string]CachedReflectionData),
	}
}

func (crd *CachedReflectionData) IsExpired() bool {
	return time.Now().Unix()-crd.Timestamp > 300 // 5 minutes
}

func (rc *ReflectionController) DefaultEndpoint(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Default endpoint for reflection metadata"})
}

func (rc *ReflectionController) FetchReflectionDetails(c *gin.Context) {
	host := c.Param("host")
	if host == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Host parameter is required"})
		return
	}

	// Check cache first
	cacheKey := fmt.Sprintf("reflection_%s", host)
	rc.cacheMux.RLock()
	if cached, exists := rc.cache[cacheKey]; exists && !cached.IsExpired() {
		rc.cacheMux.RUnlock()
		log.Printf("Returning cached reflection data for: %s", host)
		c.JSON(http.StatusOK, cached.Data)
		return
	}
	rc.cacheMux.RUnlock()

	// Create connection
	conn, err := rc.createConnection(host)
	if err != nil {
		log.Printf("Error creating connection: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("Failed to connect: %v", err)})
		return
	}
	defer conn.Close()

	// Get reflection data
	result, err := rc.getReflectionData(conn, host)
	if err != nil {
		log.Printf("Error getting reflection data: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("Failed to get reflection data: %v", err)})
		return
	}

	// Cache the result
	rc.cacheMux.Lock()
	rc.cache[cacheKey] = CachedReflectionData{
		Data:      result,
		Timestamp: time.Now().Unix(),
	}
	rc.cacheMux.Unlock()

	c.JSON(http.StatusOK, result)
}

func (rc *ReflectionController) FetchReflectionServiceFunctionDetails(c *gin.Context) {
	host := c.Param("host")
	service := c.Param("service")
	functionInput := c.Param("functionInput")

	if host == "" || service == "" || functionInput == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Host, service, and functionInput parameters are required"})
		return
	}

	// Create connection
	conn, err := rc.createConnection(host)
	if err != nil {
		log.Printf("Error creating connection: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("Failed to connect: %v", err)})
		return
	}
	defer conn.Close()

	log.Printf("Requesting reflection data for service: %s from host: %s", service, host)

	// Get service function details
	result, err := rc.getServiceFunctionDetails(conn, service, functionInput)
	if err != nil {
		log.Printf("Error getting service function details: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("Failed to get service details: %v", err)})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (rc *ReflectionController) createConnection(host string) (*grpc.ClientConn, error) {
	return CreateFlexibleConnection(host)
}

func (rc *ReflectionController) getReflectionData(conn *grpc.ClientConn, host string) (interface{}, error) {
	log.Printf("Requesting reflection data for: %s", host)

	// Create reflection client
	refClient := grpcreflect.NewClient(context.Background(), reflectpb.NewServerReflectionClient(conn))
	defer refClient.Reset()

	// Step 1: List all services
	services, err := refClient.ListServices()
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %v", err)
	}

	if len(services) == 0 {
		return map[string]interface{}{"error": "No services found. Verify that the server supports reflection."}, nil
	}

	log.Printf("Found %d services: %v", len(services), services)

	// Step 2: Get details for each service
	var result []interface{}
	for _, serviceName := range services {
		if serviceName == "grpc.reflection.v1alpha.ServerReflection" {
			continue // Skip reflection service itself
		}

		serviceData, err := rc.getServiceDetails(refClient, serviceName)
		if err != nil {
			log.Printf("Error getting details for service %s: %v", serviceName, err)
			continue
		}
		result = append(result, serviceData)
	}

	return result, nil
}

func (rc *ReflectionController) getServiceDetails(refClient *grpcreflect.Client, serviceName string) (map[string]interface{}, error) {
	serviceDesc, err := refClient.ResolveService(serviceName)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve service %s: %v", serviceName, err)
	}

	methods := make([]map[string]interface{}, 0)
	for _, method := range serviceDesc.GetMethods() {
		methodInfo := map[string]interface{}{
			"name":        method.GetName(),
			"fullName":    method.GetFullyQualifiedName(),
			"inputType":   method.GetInputType().GetFullyQualifiedName(),
			"outputType":  method.GetOutputType().GetFullyQualifiedName(),
			"isStreaming": method.IsClientStreaming() || method.IsServerStreaming(),
		}
		methods = append(methods, methodInfo)
	}

	return map[string]interface{}{
		"serviceName": serviceName,
		"methods":     methods,
	}, nil
}

func (rc *ReflectionController) getServiceFunctionDetails(conn *grpc.ClientConn, serviceName, functionName string) (interface{}, error) {
	// Create reflection client
	refClient := grpcreflect.NewClient(context.Background(), reflectpb.NewServerReflectionClient(conn))
	defer refClient.Reset()

	// Get service descriptor
	serviceDesc, err := refClient.ResolveService(serviceName)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve service %s: %v", serviceName, err)
	}

	// Find the specific method - match by last part of function name for user-friendly API
	var methodDesc *desc.MethodDescriptor
	for _, method := range serviceDesc.GetMethods() {
		// First try exact match (case insensitive)
		if strings.EqualFold(method.GetName(), functionName) {
			methodDesc = method
			break
		}

		// Also check if the function name matches the last part of the full method name
		// e.g., "Concat" should match "addsvc.Add.Concat"
		fullName := method.GetFullyQualifiedName()
		if dotIndex := strings.LastIndex(fullName, "."); dotIndex != -1 {
			lastPart := fullName[dotIndex+1:]
			if strings.EqualFold(lastPart, functionName) {
				methodDesc = method
				log.Printf("Found method by last part matching: %s -> %s", functionName, fullName)
				break
			}
		}
	}

	if methodDesc == nil {
		return map[string]interface{}{"error": fmt.Sprintf("Method %s not found in service %s", functionName, serviceName)}, nil
	}

	// Get input and output message details
	inputDetails := rc.getMessageDetails(methodDesc.GetInputType())
	//outputDetails := rc.getMessageDetails(methodDesc.GetOutputType())

	return map[string]interface{}{
		"serviceName":   serviceName,
		"methodName":    methodDesc.GetName(),
		"fullName":      methodDesc.GetFullyQualifiedName(),
		"inputType":     methodDesc.GetInputType().GetFullyQualifiedName(),
		"outputType":    methodDesc.GetOutputType().GetFullyQualifiedName(),
		"inputDetails":  inputDetails,
		//"outputDetails": outputDetails,
		"isStreaming":   methodDesc.IsClientStreaming() || methodDesc.IsServerStreaming(),
	}, nil
}

func (rc *ReflectionController) getMessageDetails(msgDesc *desc.MessageDescriptor) map[string]interface{} {
	return rc.getMessageDetailsRecursive(msgDesc, make(map[string]bool))
}

func (rc *ReflectionController) getMessageDetailsRecursive(msgDesc *desc.MessageDescriptor, visited map[string]bool) map[string]interface{} {
	// Prevent infinite recursion for circular references
	fullName := msgDesc.GetFullyQualifiedName()
	if visited[fullName] {
		return map[string]interface{}{
			"message":  fullName,
			"circular": true,
		}
	}
	visited[fullName] = true
	defer func() { visited[fullName] = false }()

	fields := make([]map[string]interface{}, 0)

	for _, field := range msgDesc.GetFields() {
		fieldInfo := map[string]interface{}{
			"name":        field.GetName(),
			"number":      field.GetNumber(),
			"type":        field.GetType().String(),
			"label":       field.GetLabel().String(),
			"required":    field.IsRequired(),
			"repeated":    field.IsRepeated(),
			"isArray":     field.IsRepeated(),
			"description": field.GetSourceInfo().GetLeadingComments(),
		}

		// Add type-specific information and create nested structures
		switch field.GetType() {
		case descriptorpb.FieldDescriptorProto_TYPE_MESSAGE:
			if field.GetMessageType() != nil {
				fieldInfo["messageType"] = field.GetMessageType().GetFullyQualifiedName()
				fieldInfo["typeName"] = field.GetMessageType().GetFullyQualifiedName()
				// Recursively get nested message details
				fieldInfo["nestedMessage"] = rc.getMessageDetailsRecursive(field.GetMessageType(), visited)
			}
		case descriptorpb.FieldDescriptorProto_TYPE_ENUM:
			if field.GetEnumType() != nil {
				fieldInfo["enumType"] = field.GetEnumType().GetFullyQualifiedName()
				fieldInfo["typeName"] = field.GetEnumType().GetFullyQualifiedName()
				enumValues := make([]map[string]interface{}, 0)
				for _, enumVal := range field.GetEnumType().GetValues() {
					enumValues = append(enumValues, map[string]interface{}{
						"name":   enumVal.GetName(),
						"number": enumVal.GetNumber(),
					})
				}
				fieldInfo["enumValues"] = enumValues
			}
		default:
			// For primitive types, add the type name for UI compatibility
			fieldInfo["typeName"] = field.GetType().String()
		}

		fields = append(fields, fieldInfo)
	}

	// Get nested message types (defined within this message)
	nestedTypes := make([]map[string]interface{}, 0)
	for _, nestedType := range msgDesc.GetNestedMessageTypes() {
		nestedTypeInfo := map[string]interface{}{
			"name":    nestedType.GetName(),
			"message": nestedType.GetFullyQualifiedName(),
			"details": rc.getMessageDetailsRecursive(nestedType, visited),
		}
		nestedTypes = append(nestedTypes, nestedTypeInfo)
	}

	// Get enum types (defined within this message)
	enums := make([]map[string]interface{}, 0)
	for _, enumType := range msgDesc.GetNestedEnumTypes() {
		enumValues := make([]map[string]interface{}, 0)
		for _, enumVal := range enumType.GetValues() {
			enumValues = append(enumValues, map[string]interface{}{
				"name":   enumVal.GetName(),
				"number": enumVal.GetNumber(),
			})
		}
		enums = append(enums, map[string]interface{}{
			"name":       enumType.GetName(),
			"fullName":   enumType.GetFullyQualifiedName(),
			"values":     enumValues,
			"enumValues": enumValues, // For UI compatibility
		})
	}

	return map[string]interface{}{
		"message":     fullName,
		"fields":      fields,
		"nestedTypes": nestedTypes,
		"enumTypes":   enums,
	}
}
