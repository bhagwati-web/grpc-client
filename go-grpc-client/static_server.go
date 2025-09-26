package main

import (
	"grpc-client/controllers"
	"grpc-client/middleware"
	"log"
	"net/http"
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

	// Setup API routes first
	setupAPIRoutes(router, grpcController, reflectionController, collectionController)
	
	// Setup static file serving
	setupStaticRoutes(router)

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

func setupAPIRoutes(
	router *gin.Engine,
	grpcController *controllers.GrpcController,
	reflectionController *controllers.ReflectionController,
	collectionController *controllers.CollectionController,
) {
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
		collectionGroup.GET("/export", collectionController.ExportCollections)
		collectionGroup.POST("/import", collectionController.ImportCollections)
	}
}

func setupStaticRoutes(router *gin.Engine) {
	// Serve static assets with proper content types
	router.StaticFS("/assets", http.Dir("./static/assets"))
	
	// Serve other static files
	router.StaticFile("/vite.svg", "./static/vite.svg")
	
	// Serve index.html for root and SPA routes
	router.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})
	
	// SPA fallback for client-side routing
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// Serve static files directly if they exist
		if strings.HasPrefix(path, "/assets/") || path == "/vite.svg" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Static file not found"})
			return
		}
		
		// Don't serve SPA for API routes
		if strings.HasPrefix(path, "/grpc") || 
		   strings.HasPrefix(path, "/metadata") || 
		   strings.HasPrefix(path, "/collection") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}
		
		// Serve React app for all other routes (SPA routing)
		c.File("./static/index.html")
	})
}
