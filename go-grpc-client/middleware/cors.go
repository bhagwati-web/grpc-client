package middleware

import (
	"log"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles CORS headers
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Set CORS headers
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Max-Age", "3600")

		// Log CORS requests for debugging
		if c.Request.Method == "OPTIONS" {
			log.Printf("CORS preflight request from origin: %s for method: %s", origin, c.Request.Header.Get("Access-Control-Request-Method"))
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
