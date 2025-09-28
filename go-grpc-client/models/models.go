package models

import (
	"time"
)

// RequestType defines the type of request (gRPC, REST, etc.)
type RequestType string

const (
	RequestTypeGRPC RequestType = "grpc"
	RequestTypeREST RequestType = "rest"
)

// Environment represents a collection environment (dev, staging, prod, etc.)
type Environment struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Variables   map[string]string `json:"variables"`
	IsActive    bool              `json:"isActive"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

// RequestAuth represents authentication configuration
type RequestAuth struct {
	Type   string            `json:"type"`   // none, bearer, basic, api_key, etc.
	Config map[string]string `json:"config"` // Flexible auth configuration
}

// RequestHeader represents request headers
type RequestHeader struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// GRPCConfig represents gRPC specific configuration
type GRPCConfig struct {
	Service  string          `json:"service"`
	Method   string          `json:"method"`
	Message  interface{}     `json:"message"`
	Metadata []RequestHeader `json:"metadata"`
}

// RESTConfig represents REST API specific configuration
type RESTConfig struct {
	Method  string          `json:"method"` // GET, POST, PUT, DELETE, etc.
	URL     string          `json:"url"`
	Headers []RequestHeader `json:"headers"`
	Body    interface{}     `json:"body,omitempty"`
	Params  []RequestHeader `json:"params,omitempty"` // Query parameters
}

// Request represents a single request in a collection
type Request struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Type        RequestType `json:"type"`
	Order       int         `json:"order"`

	// Common configuration
	Host string      `json:"host"`
	Auth RequestAuth `json:"auth,omitempty"`

	// Type-specific configuration
	GRPCConfig *GRPCConfig `json:"grpcConfig,omitempty"`
	RESTConfig *RESTConfig `json:"restConfig,omitempty"`

	// Variables used in this request
	Variables map[string]string `json:"variables,omitempty"`

	// Metadata
	Tags      []string  `json:"tags,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Collection represents a collection with enhanced organization
type Collection struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description,omitempty"`
	Requests     []Request     `json:"requests"`
	Environments []Environment `json:"environments"`

	// Collection-level variables (inherited by all requests)
	Variables map[string]string `json:"variables,omitempty"`

	// Metadata
	Tags      []string  `json:"tags,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Workspace represents the entire workspace containing all collections
type Workspace struct {
	Collections []Collection `json:"collections"`
	Settings    interface{}  `json:"settings,omitempty"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

// Legacy support - Keep for backward compatibility
type GrpcRequest struct {
	Host     string            `json:"host" binding:"required"`
	Method   string            `json:"method" binding:"required"`
	Message  interface{}       `json:"message"`
	MetaData map[string]string `json:"metaData,omitempty"`
}

type CollectionItem struct {
	Message     interface{}       `json:"message"`
	MetaData    map[string]string `json:"metaData"`
	Host        string            `json:"host"`
	Service     string            `json:"service"`
	ServiceName string            `json:"serviceName"`
	RequestName string            `json:"requestName"`
}

// API Request/Response models
type SaveRequestRequest struct {
	CollectionID string  `json:"collectionId" binding:"required"`
	Request      Request `json:"request" binding:"required"`
}

type CreateCollectionRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
}

type UpdateCollectionRequest struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

type CreateEnvironmentRequest struct {
	CollectionID string            `json:"collectionId" binding:"required"`
	Name         string            `json:"name" binding:"required"`
	Description  string            `json:"description,omitempty"`
	Variables    map[string]string `json:"variables"`
}

type UpdateOrderRequest struct {
	Items []struct {
		ID    string `json:"id"`
		Order int    `json:"order"`
	} `json:"items" binding:"required"`
}

// Legacy support
type SaveCollectionRequest struct {
	Host     string            `json:"host" binding:"required"`
	Method   string            `json:"method" binding:"required"`
	Service  string            `json:"service"`
	Message  interface{}       `json:"message"`
	MetaData map[string]string `json:"metaData,omitempty"`
}

type DeleteCollectionRequest struct {
	CollectionName string `json:"collectionName" binding:"required"`
	Method         string `json:"method" binding:"required"`
}

// Response models
type Response struct {
	Message string      `json:"message"`
	Status  string      `json:"status"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
