package constants

import (
	"pulse-api-client/models"
	"time"
)

const (
	GrpcCollectionLocation       = ".pulse"
	GrpcCollectionFileExtension  = ".json"
	GrpcCollectionLocationSample = "static/sample-data"

	ResponseStatusSuccess = "success"
	ResponseStatusError   = "error"
)

// SampleData represents the sample data collections (for legacy compatibility)
var SampleData = []models.Collection{
	{
		ID:          "sample-grpcb",
		Name:        "grpcb",
		Description: "Sample gRPC collection",
		Requests: []models.Request{
			{
				ID:          "sample-request-1",
				Name:        "Sum",
				Description: "Add two numbers",
				Type:        models.RequestTypeGRPC,
				Order:       1,
				Host:        "grpcb.in:443",
				GRPCConfig: &models.GRPCConfig{
					Service: "addsvc.Add",
					Method:  "Sum",
					Message: map[string]interface{}{
						"a": 2,
						"b": 3,
					},
					Metadata: []models.RequestHeader{},
				},
				Auth: models.RequestAuth{
					Type:   "none",
					Config: map[string]string{},
				},
				Variables: map[string]string{},
				Tags:      []string{"sample"},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			{
				ID:          "sample-request-2",
				Name:        "Concat",
				Description: "Concatenate two strings",
				Type:        models.RequestTypeGRPC,
				Order:       2,
				Host:        "grpcb.in:443",
				GRPCConfig: &models.GRPCConfig{
					Service: "addsvc.Add",
					Method:  "Concat",
					Message: map[string]interface{}{
						"a": "a",
						"b": "b",
					},
					Metadata: []models.RequestHeader{},
				},
				Auth: models.RequestAuth{
					Type:   "none",
					Config: map[string]string{},
				},
				Variables: map[string]string{},
				Tags:      []string{"sample"},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		},
		Environments: []models.Environment{
			{
				ID:          "sample-env-1",
				Name:        "Production",
				Description: "Production environment",
				Variables: map[string]string{
					"baseUrl": "grpcb.in:443",
				},
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		},
		Variables: map[string]string{},
		Tags:      []string{"sample"},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	},
}

// ConvertToLegacyCollections converts new collections to legacy format for backward compatibility
func ConvertToLegacyCollections(collections []models.Collection) []models.Collection {
	// This function returns a legacy-compatible view of collections
	var legacyCollections []models.Collection

	for _, collection := range collections {
		legacyCollection := models.Collection{
			ID:           collection.ID,
			Name:         collection.Name,
			Description:  collection.Description,
			Requests:     []models.Request{},
			Environments: []models.Environment{},
			Variables:    collection.Variables,
			Tags:         collection.Tags,
			CreatedAt:    collection.CreatedAt,
			UpdatedAt:    collection.UpdatedAt,
		}

		// Convert requests to legacy format if needed
		for _, request := range collection.Requests {
			if request.Type == models.RequestTypeGRPC && request.GRPCConfig != nil {
				legacyCollection.Requests = append(legacyCollection.Requests, request)
			}
		}

		legacyCollections = append(legacyCollections, legacyCollection)
	}

	return legacyCollections
}
