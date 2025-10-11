package controllers

import (
	"encoding/json"
	"fmt"
	"grpc-client/constants"
	"grpc-client/models"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type EnhancedCollectionController struct {
	baseFolderPath string
	workspaceFile  string
}

func NewEnhancedCollectionController() *EnhancedCollectionController {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Printf("Error getting home directory: %v", err)
		homeDir = "."
	}

	baseFolderPath := filepath.Join(homeDir, constants.GrpcCollectionLocation)
	workspaceFile := filepath.Join(baseFolderPath, "workspace.json")

	// Ensure that the base folder exists
	if err := os.MkdirAll(baseFolderPath, 0755); err != nil {
		log.Printf("Error creating base folder: %v", err)
	}

	return &EnhancedCollectionController{
		baseFolderPath: baseFolderPath,
		workspaceFile:  workspaceFile,
	}
}

// LoadWorkspace loads the entire workspace with all collections
func (ecc *EnhancedCollectionController) LoadWorkspace(c *gin.Context) {
	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		log.Printf("Error loading workspace: %v", err)
		// Return empty workspace if file doesn't exist or is corrupted
		workspace = &models.Workspace{
			Collections: []models.Collection{},
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}

	// Add legacy collections for backward compatibility
	legacyCollections := ecc.loadLegacyCollections()
	workspace.Collections = append(workspace.Collections, legacyCollections...)

	// Sort collections by name
	sort.Slice(workspace.Collections, func(i, j int) bool {
		return strings.ToLower(workspace.Collections[i].Name) < strings.ToLower(workspace.Collections[j].Name)
	})

	c.JSON(http.StatusOK, workspace)
}

// CreateCollection creates a new collection
func (ecc *EnhancedCollectionController) CreateCollection(c *gin.Context) {
	var req models.CreateCollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		workspace = &models.Workspace{
			Collections: []models.Collection{},
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}

	// Check if collection name already exists
	for _, collection := range workspace.Collections {
		if strings.EqualFold(collection.Name, req.Name) {
			c.JSON(http.StatusConflict, models.ErrorResponse{Error: "Collection with this name already exists"})
			return
		}
	}

	// Create new collection
	newCollection := models.Collection{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Description:  req.Description,
		Requests:     []models.Request{},
		Environments: []models.Environment{},
		Variables:    make(map[string]string),
		Tags:         []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	workspace.Collections = append(workspace.Collections, newCollection)
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to save collection"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Collection created successfully",
		Status:  constants.ResponseStatusSuccess,
		Data:    newCollection,
	})
}

// UpdateCollection updates an existing collection's metadata
func (ecc *EnhancedCollectionController) UpdateCollection(c *gin.Context) {
	collectionID := c.Param("id")
	if collectionID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Collection ID is required"})
		return
	}

	var req models.UpdateCollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Find the collection in workspace
	var targetCollection *models.Collection
	for i, collection := range workspace.Collections {
		if collection.ID == collectionID {
			targetCollection = &workspace.Collections[i]
			break
		}
	}

	if targetCollection == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Collection not found"})
		return
	}

	// Check if collection is read-only (legacy collections)
	legacyCollections := ecc.loadLegacyCollections()
	isLegacy := false
	for _, legacyCol := range legacyCollections {
		if legacyCol.ID == collectionID {
			isLegacy = true
			break
		}
	}

	if isLegacy {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "Cannot update read-only collections"})
		return
	}

	// Update fields if provided
	updated := false
	if req.Name != "" {
		// Check if new name already exists (excluding current collection)
		for _, collection := range workspace.Collections {
			if collection.ID != collectionID && strings.EqualFold(collection.Name, req.Name) {
				c.JSON(http.StatusConflict, models.ErrorResponse{Error: "Collection with this name already exists"})
				return
			}
		}
		targetCollection.Name = req.Name
		updated = true
	}

	if req.Description != "" || (req.Description == "" && len(req.Description) >= 0) {
		targetCollection.Description = req.Description
		updated = true
	}

	if updated {
		targetCollection.UpdatedAt = time.Now()
		workspace.UpdatedAt = time.Now()
	}

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update collection"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Collection updated successfully",
		Status:  constants.ResponseStatusSuccess,
		Data:    *targetCollection,
	})
}

// SaveRequest saves or updates a request in a collection
func (ecc *EnhancedCollectionController) SaveRequest(c *gin.Context) {
	var req models.SaveRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Find the collection
	var targetCollection *models.Collection
	for i := range workspace.Collections {
		if workspace.Collections[i].ID == req.CollectionID {
			targetCollection = &workspace.Collections[i]
			break
		}
	}

	if targetCollection == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Collection not found"})
		return
	}

	// Generate ID if not provided (new request)
	if req.Request.ID == "" {
		req.Request.ID = uuid.New().String()
		req.Request.CreatedAt = time.Now()
	}

	req.Request.UpdatedAt = time.Now()

	// Set order if not provided
	if req.Request.Order == 0 {
		req.Request.Order = len(targetCollection.Requests) + 1
	}

	// Check if request already exists (update) or is new (create)
	updated := false
	for i, existingRequest := range targetCollection.Requests {
		if existingRequest.ID == req.Request.ID {
			targetCollection.Requests[i] = req.Request
			updated = true
			break
		}
	}

	if !updated {
		targetCollection.Requests = append(targetCollection.Requests, req.Request)
	}

	targetCollection.UpdatedAt = time.Now()
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to save request"})
		return
	}

	action := "created"
	if updated {
		action = "updated"
	}

	c.JSON(http.StatusOK, models.Response{
		Message: fmt.Sprintf("Request %s successfully", action),
		Status:  constants.ResponseStatusSuccess,
		Data:    req.Request,
	})
}

// UpdateRequest updates an existing request
func (ecc *EnhancedCollectionController) UpdateRequest(c *gin.Context) {
	requestID := c.Param("requestId")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Request ID is required"})
		return
	}

	// Parse the update request as a map to handle partial updates
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Merge legacy collections for searching
	legacyCollections := ecc.loadLegacyCollections()
	allCollections := append(workspace.Collections, legacyCollections...)

	// Find the request across all collections
	var targetCollection *models.Collection
	var requestIndex int = -1

	for i := range allCollections {
		for j, request := range allCollections[i].Requests {
			if request.ID == requestID {
				targetCollection = &allCollections[i]
				requestIndex = j
				break
			}
		}
		if targetCollection != nil {
			break
		}
	}

	if targetCollection == nil || requestIndex == -1 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Request not found"})
		return
	}

	// Don't allow updating legacy (read-only) collections
	isLegacy := false
	for _, legacyCol := range legacyCollections {
		if legacyCol.ID == targetCollection.ID {
			isLegacy = true
			break
		}
	}

	if isLegacy {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "Cannot update requests in read-only collections"})
		return
	}

	// Update the request (preserve the original ID, CreatedAt, and Order)
	originalRequest := targetCollection.Requests[requestIndex]
	updatedRequest := originalRequest // Start with the original request

	// Update fields that are provided
	if name, ok := updateData["name"]; ok {
		if nameStr, ok := name.(string); ok {
			updatedRequest.Name = nameStr
		}
	}

	if host, ok := updateData["host"]; ok {
		if hostStr, ok := host.(string); ok {
			updatedRequest.Host = hostStr
		}
	}

	if reqType, ok := updateData["type"]; ok {
		if typeStr, ok := reqType.(string); ok {
			updatedRequest.Type = models.RequestType(typeStr)
		}
	}

	// Update gRPC config if provided
	if grpcConfig, ok := updateData["grpcConfig"]; ok {
		if grpcMap, ok := grpcConfig.(map[string]interface{}); ok {
			if updatedRequest.GRPCConfig == nil {
				updatedRequest.GRPCConfig = &models.GRPCConfig{}
			}

			if service, ok := grpcMap["service"]; ok {
				if serviceStr, ok := service.(string); ok {
					updatedRequest.GRPCConfig.Service = serviceStr
				}
			}

			if method, ok := grpcMap["method"]; ok {
				if methodStr, ok := method.(string); ok {
					updatedRequest.GRPCConfig.Method = methodStr
				}
			}

			if message, ok := grpcMap["message"]; ok {
				updatedRequest.GRPCConfig.Message = message
			}

			if metadata, ok := grpcMap["metadata"]; ok {
				if metadataSlice, ok := metadata.([]interface{}); ok {
					var headers []models.RequestHeader
					for _, item := range metadataSlice {
						if headerMap, ok := item.(map[string]interface{}); ok {
							header := models.RequestHeader{}
							if key, ok := headerMap["key"].(string); ok {
								header.Key = key
							}
							if value, ok := headerMap["value"].(string); ok {
								header.Value = value
							}
							if enabled, ok := headerMap["enabled"].(bool); ok {
								header.Enabled = enabled
							}
							headers = append(headers, header)
						}
					}
					updatedRequest.GRPCConfig.Metadata = headers
				}
			}
		}
	}

	// Update REST config if provided
	if restConfig, ok := updateData["restConfig"]; ok {
		if restMap, ok := restConfig.(map[string]interface{}); ok {
			if updatedRequest.RESTConfig == nil {
				updatedRequest.RESTConfig = &models.RESTConfig{}
			}

			if method, ok := restMap["method"]; ok {
				if methodStr, ok := method.(string); ok {
					updatedRequest.RESTConfig.Method = methodStr
				}
			}

			if url, ok := restMap["url"]; ok {
				if urlStr, ok := url.(string); ok {
					log.Printf("DEBUG: Updating URL from '%s' to '%s'", updatedRequest.RESTConfig.URL, urlStr)
					updatedRequest.RESTConfig.URL = urlStr
				}
			}

			if body, ok := restMap["body"]; ok {
				updatedRequest.RESTConfig.Body = body
			}

			if headers, ok := restMap["headers"]; ok {
				if headersSlice, ok := headers.([]interface{}); ok {
					var restHeaders []models.RequestHeader
					for _, item := range headersSlice {
						if headerMap, ok := item.(map[string]interface{}); ok {
							header := models.RequestHeader{}
							if key, ok := headerMap["key"].(string); ok {
								header.Key = key
							}
							if value, ok := headerMap["value"].(string); ok {
								header.Value = value
							}
							if enabled, ok := headerMap["enabled"].(bool); ok {
								header.Enabled = enabled
							}
							restHeaders = append(restHeaders, header)
						}
					}
					updatedRequest.RESTConfig.Headers = restHeaders
				}
			}

			if params, ok := restMap["params"]; ok {
				if paramsSlice, ok := params.([]interface{}); ok {
					var restParams []models.RequestHeader
					for _, item := range paramsSlice {
						if paramMap, ok := item.(map[string]interface{}); ok {
							param := models.RequestHeader{}
							if key, ok := paramMap["key"].(string); ok {
								param.Key = key
							}
							if value, ok := paramMap["value"].(string); ok {
								param.Value = value
							}
							if enabled, ok := paramMap["enabled"].(bool); ok {
								param.Enabled = enabled
							}
							restParams = append(restParams, param)
						}
					}
					updatedRequest.RESTConfig.Params = restParams
				}
			}
		}
	}

	// Always update the timestamp
	updatedRequest.UpdatedAt = time.Now()

	// Update the request in the collection
	targetCollection.Requests[requestIndex] = updatedRequest
	targetCollection.UpdatedAt = time.Now()
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update request"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Request updated successfully",
		Status:  constants.ResponseStatusSuccess,
		Data:    updatedRequest,
	})
}

// CreateEnvironment creates a new environment in a collection
func (ecc *EnhancedCollectionController) CreateEnvironment(c *gin.Context) {
	var req models.CreateEnvironmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Find the collection
	var targetCollection *models.Collection
	for i := range workspace.Collections {
		if workspace.Collections[i].ID == req.CollectionID {
			targetCollection = &workspace.Collections[i]
			break
		}
	}

	if targetCollection == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Collection not found"})
		return
	}

	// Create new environment
	newEnvironment := models.Environment{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Variables:   req.Variables,
		IsActive:    len(targetCollection.Environments) == 0, // First environment is active by default
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	targetCollection.Environments = append(targetCollection.Environments, newEnvironment)
	targetCollection.UpdatedAt = time.Now()
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create environment"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Environment created successfully",
		Status:  constants.ResponseStatusSuccess,
		Data:    newEnvironment,
	})
}

// Helper functions
func (ecc *EnhancedCollectionController) loadWorkspaceFromFile() (*models.Workspace, error) {
	if _, err := os.Stat(ecc.workspaceFile); os.IsNotExist(err) {
		return &models.Workspace{
			Collections: []models.Collection{},
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}, nil
	}

	content, err := ioutil.ReadFile(ecc.workspaceFile)
	if err != nil {
		return nil, err
	}

	var workspace models.Workspace
	if err := json.Unmarshal(content, &workspace); err != nil {
		return nil, err
	}

	return &workspace, nil
}

func (ecc *EnhancedCollectionController) saveWorkspaceToFile(workspace *models.Workspace) error {
	workspace.UpdatedAt = time.Now()

	content, err := json.MarshalIndent(workspace, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(ecc.workspaceFile, content, 0644)
}

// DeleteCollection deletes an entire collection
func (ecc *EnhancedCollectionController) DeleteCollection(c *gin.Context) {
	collectionID := c.Param("id")
	if collectionID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Collection ID is required"})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Find and remove the collection
	collectionIndex := -1
	for i, collection := range workspace.Collections {
		if collection.ID == collectionID {
			collectionIndex = i
			break
		}
	}

	if collectionIndex == -1 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Collection not found"})
		return
	}

	// Remove the collection
	workspace.Collections = append(workspace.Collections[:collectionIndex], workspace.Collections[collectionIndex+1:]...)
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to delete collection"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Collection deleted successfully",
		Status:  constants.ResponseStatusSuccess,
	})
}

// DeleteRequest deletes a request from any collection by request ID
func (ecc *EnhancedCollectionController) DeleteRequest(c *gin.Context) {
	requestID := c.Param("requestId")

	if requestID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Request ID is required"})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Merge legacy collections (sample/converted legacy data) so they are searchable
	legacyCollections := ecc.loadLegacyCollections()
	// append legacy collections that are not already present in workspace
	existingIDs := make(map[string]bool)
	for _, col := range workspace.Collections {
		existingIDs[col.ID] = true
	}
	for _, lcol := range legacyCollections {
		if !existingIDs[lcol.ID] {
			workspace.Collections = append(workspace.Collections, lcol)
		}
	}

	// Find the collection containing the request
	var targetCollection *models.Collection
	requestIndex := -1
	for i := range workspace.Collections {
		for j, req := range workspace.Collections[i].Requests {
			if req.ID == requestID {
				targetCollection = &workspace.Collections[i]
				requestIndex = j
				break
			}
		}
		if targetCollection != nil {
			break
		}
	}

	if targetCollection == nil || requestIndex == -1 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Request not found"})
		return
	}

	// Remove the request
	targetCollection.Requests = append(targetCollection.Requests[:requestIndex], targetCollection.Requests[requestIndex+1:]...)
	targetCollection.UpdatedAt = time.Now()
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to delete request"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Request deleted successfully",
		Status:  constants.ResponseStatusSuccess,
	})
}

// UpdateOrder updates the order of items (requests or folders)
func (ecc *EnhancedCollectionController) UpdateOrder(c *gin.Context) {
	collectionID := c.Param("id")
	var req models.UpdateOrderRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	// Find the collection
	var targetCollection *models.Collection
	for i := range workspace.Collections {
		if workspace.Collections[i].ID == collectionID {
			targetCollection = &workspace.Collections[i]
			break
		}
	}

	if targetCollection == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Collection not found"})
		return
	}

	// Update orders for requests
	for _, item := range req.Items {
		for i := range targetCollection.Requests {
			if targetCollection.Requests[i].ID == item.ID {
				targetCollection.Requests[i].Order = item.Order
				targetCollection.Requests[i].UpdatedAt = time.Now()
				break
			}
		}
	}

	targetCollection.UpdatedAt = time.Now()
	workspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(workspace); err != nil {
		log.Printf("Error saving workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update order"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Order updated successfully",
		Status:  constants.ResponseStatusSuccess,
	})
}

// ExportWorkspace exports the entire workspace
func (ecc *EnhancedCollectionController) ExportWorkspace(c *gin.Context) {
	workspace, err := ecc.loadWorkspaceFromFile()
	if err != nil {
		log.Printf("Error loading workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to load workspace"})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=workspace_export.json")
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, workspace)
}

// ImportWorkspace imports a workspace (replaces current workspace)
func (ecc *EnhancedCollectionController) ImportWorkspace(c *gin.Context) {
	var importedWorkspace models.Workspace
	if err := c.ShouldBindJSON(&importedWorkspace); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid workspace format: %v", err)})
		return
	}

	// Validate and regenerate IDs to avoid conflicts
	ecc.regenerateWorkspaceIDs(&importedWorkspace)
	importedWorkspace.UpdatedAt = time.Now()

	if err := ecc.saveWorkspaceToFile(&importedWorkspace); err != nil {
		log.Printf("Error saving imported workspace: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to import workspace"})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Workspace imported successfully",
		Status:  constants.ResponseStatusSuccess,
		Data:    importedWorkspace,
	})
}

// Helper function to regenerate IDs to avoid conflicts
func (ecc *EnhancedCollectionController) regenerateWorkspaceIDs(workspace *models.Workspace) {
	for i := range workspace.Collections {
		collection := &workspace.Collections[i]

		// Generate new collection ID
		collection.ID = uuid.New().String()

		// Update request IDs
		for j := range collection.Requests {
			collection.Requests[j].ID = uuid.New().String()
		}

		// Update environment IDs
		for j := range collection.Environments {
			collection.Environments[j].ID = uuid.New().String()
		}
	}
}

// Load legacy collections for backward compatibility
func (ecc *EnhancedCollectionController) loadLegacyCollections() []models.Collection {
	// Return sample data for now (from constants)
	// Later this would integrate with the existing CollectionController
	// to load old format collections and convert them to new format
	return constants.SampleData
}
