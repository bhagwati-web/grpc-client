package controllers

import (
	"grpc-client/constants"
	"grpc-client/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CollectionController - Legacy compatibility layer
// Redirects to enhanced collection system
type CollectionController struct {
	enhancedController *EnhancedCollectionController
}

func NewCollectionController() *CollectionController {
	return &CollectionController{
		enhancedController: NewEnhancedCollectionController(),
	}
}

// LoadCollection - Returns sample data for backward compatibility
func (cc *CollectionController) LoadCollection(c *gin.Context) {
	// Return sample collections for backward compatibility
	c.JSON(http.StatusOK, constants.SampleData)
}

// SaveCollection - Deprecated, redirects to enhanced system
func (cc *CollectionController) SaveCollection(c *gin.Context) {
	c.JSON(http.StatusOK, models.Response{
		Message: "Please use the new enhanced save dialog - legacy endpoint deprecated",
		Status:  constants.ResponseStatusSuccess,
	})
}

// DeleteCollection - Deprecated, redirects to enhanced system
func (cc *CollectionController) DeleteCollection(c *gin.Context) {
	c.JSON(http.StatusOK, models.Response{
		Message: "Please use the new enhanced collection management - legacy endpoint deprecated",
		Status:  constants.ResponseStatusSuccess,
	})
}

// ExportCollections - Redirects to enhanced export
func (cc *CollectionController) ExportCollections(c *gin.Context) {
	cc.enhancedController.ExportWorkspace(c)
}

// ImportCollections - Redirects to enhanced import
func (cc *CollectionController) ImportCollections(c *gin.Context) {
	cc.enhancedController.ImportWorkspace(c)
}
