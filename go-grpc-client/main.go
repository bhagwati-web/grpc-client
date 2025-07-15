package main

import (
	"grpc-client/controllers"
	"grpc-client/middleware"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

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
	collectionController := controllers.NewCollectionController()

	// Setup routes
	setupRoutes(router, grpcController, reflectionController, collectionController)

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
	collectionController *controllers.CollectionController,
) {
	// API routes must be defined BEFORE static routes to take precedence
	
	// gRPC routes
	grpcGroup := router.Group("/grpc")
	{
		grpcGroup.GET("/", grpcController.DefaultEndpoint)
		grpcGroup.POST("/call", grpcController.MakeGrpcCall)
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
		collectionGroup.GET("/load", collectionController.LoadCollection)
		collectionGroup.POST("/save", collectionController.SaveCollection)
		collectionGroup.DELETE("/delete", collectionController.DeleteCollection)
	}
	
	// Serve all static files from the static directory
	// This will serve assets, vite.svg, and any other static files
	router.StaticFS("/assets", gin.Dir("./static/assets", false))
	router.StaticFile("/vite.svg", "./static/vite.svg")
	
	// Serve the main React app for the root path
	router.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})
	
	// SPA fallback - serve React app for all other non-API routes
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
			// Serve React app for client-side routing
			c.File("./static/index.html")
		}
	})
}
