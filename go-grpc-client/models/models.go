package models

// GrpcRequest represents the gRPC request structure
type GrpcRequest struct {
	Host     string            `json:"host" binding:"required"`
	Method   string            `json:"method" binding:"required"`
	Message  interface{}       `json:"message"`
	MetaData map[string]string `json:"metaData,omitempty"` // Flat object format
}

// CollectionItem represents a single collection item
type CollectionItem struct {
	Message     interface{}       `json:"message"`
	MetaData    map[string]string `json:"metaData"`
	Host        string            `json:"host"`
	Service     string            `json:"service"`
	ServiceName string            `json:"serviceName"`
	RequestName string            `json:"requestName"`
}

// Collection represents a collection with title and items
type Collection struct {
	Title string           `json:"title"`
	Items []CollectionItem `json:"items"`
}

// SaveCollectionRequest represents the request to save a collection
type SaveCollectionRequest struct {
	Host     string            `json:"host" binding:"required"`
	Method   string            `json:"method" binding:"required"`
	Service  string            `json:"service"`
	Message  interface{}       `json:"message"`
	MetaData map[string]string `json:"metaData,omitempty"` // Flat object format
}

// DeleteCollectionRequest represents the request to delete a collection
type DeleteCollectionRequest struct {
	CollectionName string `json:"collectionName" binding:"required"`
	Method         string `json:"method" binding:"required"`
}

// Response represents a standard API response
type Response struct {
	Message string `json:"message"`
	Status  string `json:"status"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}
