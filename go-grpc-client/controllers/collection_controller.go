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

	"github.com/gin-gonic/gin"
)

type CollectionController struct {
	baseFolderPath string
}

func NewCollectionController() *CollectionController {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Printf("Error getting home directory: %v", err)
		homeDir = "."
	}
	
	baseFolderPath := filepath.Join(homeDir, constants.GrpcCollectionLocation)
	
	// Ensure that the base folder exists
	if err := os.MkdirAll(baseFolderPath, 0755); err != nil {
		log.Printf("Error creating base folder: %v", err)
	}
	
	return &CollectionController{
		baseFolderPath: baseFolderPath,
	}
}

func (cc *CollectionController) LoadCollection(c *gin.Context) {
	// Load user collections from the filesystem
	userCollections := cc.getAllCollectionFromFolder()
	
	// Load sample collections
	sampleCollections := cc.getAllCollectionFromSampleData()
	
	// Combine collections
	allCollections := append(userCollections, sampleCollections...)
	
	// Sort collections alphabetically by title (name)
	sort.Slice(allCollections, func(i, j int) bool {
		return strings.ToLower(allCollections[i].Title) < strings.ToLower(allCollections[j].Title)
	})
	
	c.JSON(http.StatusOK, allCollections)
}

func (cc *CollectionController) SaveCollection(c *gin.Context) {
	var collection models.SaveCollectionRequest
	if err := c.ShouldBindJSON(&collection); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	// Extract collection name from host
	collectionName := collection.Host
	if idx := strings.Index(collectionName, "."); idx != -1 {
		collectionName = collectionName[:idx]
	}
	
	// Extract request name from method
	requestName := collection.Method
	if idx := strings.LastIndex(requestName, "."); idx != -1 {
		requestName = requestName[idx+1:]
	}

	if collectionName == "" || requestName == "" {
		c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid collection",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	// Create subfolder
	subfolderPath := filepath.Join(cc.baseFolderPath, collectionName)
	if err := os.MkdirAll(subfolderPath, 0755); err != nil {
		log.Printf("Error creating subfolder: %v", err)
		c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Error creating collection folder",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	// Create file path
	fileName := fmt.Sprintf("%s%s", requestName, constants.GrpcCollectionFileExtension)
	filePath := filepath.Join(subfolderPath, fileName)

	// Check if file already exists
	isNewFile := true
	if _, err := os.Stat(filePath); err == nil {
		isNewFile = false
	}

	// Convert collection to JSON
	fileContent, err := json.MarshalIndent(collection, "", "  ")
	if err != nil {
		log.Printf("Error marshaling collection: %v", err)
		c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Error saving collection",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	// Write file
	if err := ioutil.WriteFile(filePath, fileContent, 0644); err != nil {
		log.Printf("Error writing file: %v", err)
		c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Error saving collection",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	message := "Collection updated successfully"
	if isNewFile {
		message = "Collection saved successfully. You can reuse this request later."
	}

	c.JSON(http.StatusOK, models.Response{
		Message: message,
		Status:  constants.ResponseStatusSuccess,
	})
}

func (cc *CollectionController) DeleteCollection(c *gin.Context) {
	var deleteRequest models.DeleteCollectionRequest
	if err := c.ShouldBindJSON(&deleteRequest); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	// Extract request name from method
	requestName := deleteRequest.Method
	if idx := strings.LastIndex(requestName, "."); idx != -1 {
		requestName = requestName[idx+1:]
	}

	if deleteRequest.CollectionName == "" || requestName == "" {
		c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid collection",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	// Create file path
	fileName := fmt.Sprintf("%s%s", requestName, constants.GrpcCollectionFileExtension)
	filePath := filepath.Join(cc.baseFolderPath, deleteRequest.CollectionName, fileName)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// Check if it's a sample collection
		if cc.isSampleCollection(deleteRequest.CollectionName, requestName) {
			c.JSON(http.StatusBadRequest, models.Response{
				Message: "Sample data cannot be deleted",
				Status:  constants.ResponseStatusError,
			})
			return
		}

		c.JSON(http.StatusNotFound, models.Response{
			Message: "Collection not found",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	// Delete file
	if err := os.Remove(filePath); err != nil {
		log.Printf("Error deleting file: %v", err)
		c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Error deleting collection",
			Status:  constants.ResponseStatusError,
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Message: "Collection deleted successfully",
		Status:  constants.ResponseStatusSuccess,
	})
}

func (cc *CollectionController) getAllCollectionFromFolder() []models.Collection {
	var collections []models.Collection
	collectionsMap := make(map[string]*models.Collection)

	err := filepath.Walk(cc.baseFolderPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && strings.HasSuffix(path, constants.GrpcCollectionFileExtension) {
			// Read file content
			content, err := ioutil.ReadFile(path)
			if err != nil {
				log.Printf("Error reading file %s: %v", path, err)
				return nil
			}

			// Parse JSON content
			var collectionData models.SaveCollectionRequest
			if err := json.Unmarshal(content, &collectionData); err != nil {
				log.Printf("Error unmarshaling file %s: %v", path, err)
				return nil
			}

			// Extract service name from path
			dir := filepath.Dir(path)
			serviceName := filepath.Base(dir)
			
			// Extract request name from filename
			filename := filepath.Base(path)
			requestName := strings.TrimSuffix(filename, constants.GrpcCollectionFileExtension)

			// Add to collections
			cc.addToCollections(collectionsMap, serviceName, requestName, collectionData)
		}
		return nil
	})

	if err != nil {
		log.Printf("Error walking directory: %v", err)
	}

	// Convert map to slice
	for _, collection := range collectionsMap {
		collections = append(collections, *collection)
	}

	return collections
}

func (cc *CollectionController) getAllCollectionFromSampleData() []models.Collection {
	return constants.SampleData
}

func (cc *CollectionController) addToCollections(
	collectionsMap map[string]*models.Collection,
	serviceName, requestName string,
	collectionData models.SaveCollectionRequest,
) {
	if _, exists := collectionsMap[serviceName]; !exists {
		collectionsMap[serviceName] = &models.Collection{
			Title: serviceName,
			Items: []models.CollectionItem{},
		}
	}

	// Convert metadata to the expected format (flat object)
	var metaData map[string]string
	if collectionData.MetaData != nil {
		metaData = make(map[string]string)
		switch md := collectionData.MetaData.(type) {
		case map[string]interface{}:
			// Handle flat object format (preferred - what UI sends)
			for k, v := range md {
				if strVal, ok := v.(string); ok {
					metaData[k] = strVal
				}
			}
		case map[string]string:
			// Handle strongly typed flat object
			metaData = md
		case []interface{}:
			// Handle legacy array format - flatten all objects into one
			for _, item := range md {
				if itemMap, ok := item.(map[string]interface{}); ok {
					for k, v := range itemMap {
						if strVal, ok := v.(string); ok {
							metaData[k] = strVal
						}
					}
				}
			}
		case []map[string]string:
			// Handle strongly typed array format - flatten all objects into one
			for _, itemMap := range md {
				for k, v := range itemMap {
					metaData[k] = v
				}
			}
		}
	}

	item := models.CollectionItem{
		Message:     collectionData.Message,
		MetaData:    metaData,
		Host:        collectionData.Host,
		Service:     collectionData.Service, // Using serviceName as service
		ServiceName: serviceName,
		RequestName: requestName,
	}

	collectionsMap[serviceName].Items = append(collectionsMap[serviceName].Items, item)
}

func (cc *CollectionController) isSampleCollection(collectionName, requestName string) bool {
	sampleCollections := cc.getAllCollectionFromSampleData()
	
	for _, collection := range sampleCollections {
		if collection.Title == collectionName {
			for _, item := range collection.Items {
				if item.RequestName == requestName {
					return true
				}
			}
		}
	}
	
	return false
}
