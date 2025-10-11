package main

import (
	"embed"
	"pulse-api-client/controllers"
	"pulse-api-client/middleware"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.DebugMode)
	}

	// Create Gin router
	router := gin.Default()

	// Add CORS middleware
	router.Use(middleware.CORSMiddleware())

	// Add logging middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Initialize controllers
	grpcController := controllers.NewGrpcController()
	reflectionController := controllers.NewReflectionController()
	enhancedCollectionController := controllers.NewEnhancedCollectionController()
	restController := controllers.NewRestController()

	// Setup routes
	setupRoutes(router, grpcController, reflectionController, enhancedCollectionController, restController)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "50051"
	}

	log.Printf("Starting server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupRoutes(
	router *gin.Engine,
	grpcController *controllers.GrpcController,
	reflectionController *controllers.ReflectionController,
	enhancedCollectionController *controllers.EnhancedCollectionController,
	restController *controllers.RestController,
) {
	// API routes must be defined BEFORE static routes to take precedence

	// gRPC routes
	grpcGroup := router.Group("/grpc")
	{
		grpcGroup.GET("/", grpcController.DefaultEndpoint)
		grpcGroup.POST("/call", grpcController.MakeGrpcCall)
	}

	// REST API routes
	restGroup := router.Group("/rest")
	{
		restGroup.GET("/", restController.DefaultEndpoint)
		restGroup.POST("/call", restController.MakeRestCall)
	}

	// Metadata/reflection routes
	metadataGroup := router.Group("/metadata")
	{
		metadataGroup.GET("/", reflectionController.DefaultEndpoint)
		metadataGroup.GET("/:host", reflectionController.FetchReflectionDetails)
		metadataGroup.GET("/:host/:service/:functionInput", reflectionController.FetchReflectionServiceFunctionDetails)
	}

	// Collection routes
	collectionGroup := router.Group("/collection")
	{
		// Workspace management
		collectionGroup.GET("/workspace", enhancedCollectionController.LoadWorkspace)
		collectionGroup.GET("/workspace/export", enhancedCollectionController.ExportWorkspace)
		collectionGroup.POST("/workspace/import", enhancedCollectionController.ImportWorkspace)

		// Collection management
		collectionGroup.POST("/collections", enhancedCollectionController.CreateCollection)
		collectionGroup.PUT("/collections/:id", enhancedCollectionController.UpdateCollection)
		collectionGroup.DELETE("/collections/:id", enhancedCollectionController.DeleteCollection)
		collectionGroup.PUT("/collections/:id/order", enhancedCollectionController.UpdateOrder)

		// Request management
		collectionGroup.POST("/requests", enhancedCollectionController.SaveRequest)
		collectionGroup.PUT("/requests/:requestId", enhancedCollectionController.UpdateRequest)
		collectionGroup.DELETE("/requests/:requestId", enhancedCollectionController.DeleteRequest)

		// Environment management
		collectionGroup.POST("/environments", enhancedCollectionController.CreateEnvironment)
	}

	// Serve embedded static files - create filesystem for assets subdirectory
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal("Failed to create static file system:", err)
	}

	// Create sub-filesystem for assets directory
	assetsFS, err := fs.Sub(staticFS, "assets")
	if err != nil {
		log.Fatal("Failed to create assets file system:", err)
	}

	// Serve assets from the embedded filesystem
	router.StaticFS("/assets", http.FS(assetsFS))

	// Serve vite.svg from embedded files
	router.GET("/vite.svg", func(c *gin.Context) {
		data, err := staticFiles.ReadFile("static/vite.svg")
		if err != nil {
			c.JSON(404, gin.H{"error": "File not found"})
			return
		}
		c.Data(200, "image/svg+xml", data)
	})

	// Serve the main React app for the root path from embedded files
	router.GET("/", func(c *gin.Context) {
		data, err := staticFiles.ReadFile("static/index.html")
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to load index.html"})
			return
		}
		c.Data(200, "text/html; charset=utf-8", data)
	})

	// SPA fallback - serve React app for all other non-API routes from embedded files
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// Don't serve SPA for API routes or asset requests
		if strings.HasPrefix(path, "/grpc") ||
			strings.HasPrefix(path, "/metadata") ||
			strings.HasPrefix(path, "/collection") ||
			strings.HasPrefix(path, "/assets") ||
			path == "/vite.svg" {
			c.JSON(404, gin.H{"error": "Not found"})
		} else {
			// Serve React app for client-side routing from embedded files
			data, err := staticFiles.ReadFile("static/index.html")
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to load index.html"})
				return
			}
			c.Data(200, "text/html; charset=utf-8", data)
		}
	})
}
