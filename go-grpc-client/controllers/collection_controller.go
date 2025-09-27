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
			Message: "Error saving collection, please run 'grpcstop' and 'grpcstart' commands in your terminal and try again.",
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

	// Use metadata directly since it's now map[string]string
	metaData := collectionData.MetaData

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

// ExportCollections exports all collections as JSON
func (cc *CollectionController) ExportCollections(c *gin.Context) {
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

	c.Header("Content-Disposition", "attachment; filename=collection_exported.json")
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, allCollections)
}

// ImportCollections imports collections from JSON
func (cc *CollectionController) ImportCollections(c *gin.Context) {
	var importData []models.Collection
	if err := c.ShouldBindJSON(&importData); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	successCount := 0
	errorCount := 0

	// Process each collection group
	for _, collectionGroup := range importData {
		for _, item := range collectionGroup.Items {
			// Prepare save data
			collection := models.SaveCollectionRequest{
				Host:     item.Host,
				Method:   fmt.Sprintf("%s.%s", item.Service, item.RequestName),
				Message:  item.Message,
				MetaData: item.MetaData,
				Service:  item.Service,
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
				errorCount++
				continue
			}

			// Create subfolder
			subfolderPath := filepath.Join(cc.baseFolderPath, collectionName)
			if err := os.MkdirAll(subfolderPath, 0755); err != nil {
				log.Printf("Error creating subfolder: %v", err)
				errorCount++
				continue
			}

			// Create file path
			fileName := fmt.Sprintf("%s%s", requestName, constants.GrpcCollectionFileExtension)
			filePath := filepath.Join(subfolderPath, fileName)

			// Convert collection to JSON
			fileContent, err := json.MarshalIndent(collection, "", "  ")
			if err != nil {
				log.Printf("Error marshaling collection: %v", err)
				errorCount++
				continue
			}

			// Write file
			if err := ioutil.WriteFile(filePath, fileContent, 0644); err != nil {
				log.Printf("Error writing file: %v", err)
				errorCount++
				continue
			}

			successCount++
		}
	}

	response := models.Response{
		Message: fmt.Sprintf("Import completed: %d successful, %d failed", successCount, errorCount),
		Status:  constants.ResponseStatusSuccess,
	}

	if errorCount > 0 && successCount == 0 {
		response.Status = constants.ResponseStatusError
		c.JSON(http.StatusBadRequest, response)
	} else {
		c.JSON(http.StatusOK, response)
	}
}
