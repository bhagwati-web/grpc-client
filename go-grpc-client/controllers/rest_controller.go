package controllers

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"grpc-client/models"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type RestController struct {
	httpClient *http.Client
}

func NewRestController() *RestController {
	// Create HTTP client with reasonable timeouts and security settings
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false, // Enforce TLS verification by default
		},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     30 * time.Second,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second, // Default timeout
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Allow up to 10 redirects
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	return &RestController{
		httpClient: client,
	}
}

func (rc *RestController) DefaultEndpoint(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "REST API proxy endpoint",
		"version": "1.0.0",
		"features": []string{
			"HTTP/HTTPS requests",
			"CORS handling",
			"Request/Response timing",
			"Header management",
			"JSON/Text body support",
		},
	})
}

func (rc *RestController) MakeRestCall(c *gin.Context) {
	var restRequest models.RestRequest
	if err := c.ShouldBindJSON(&restRequest); err != nil {
		log.Printf("Error binding REST request JSON: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}

	log.Printf("Making REST call: %s %s", restRequest.Method, restRequest.URL)

	// Validate the request
	if err := rc.validateRequest(&restRequest); err != nil {
		log.Printf("REST request validation failed: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: fmt.Sprintf("Request validation failed: %v", err),
		})
		return
	}

	// Set custom timeout if provided
	client := rc.httpClient
	if restRequest.Timeout > 0 {
		client = &http.Client{
			Transport:     rc.httpClient.Transport,
			Timeout:       time.Duration(restRequest.Timeout) * time.Second,
			CheckRedirect: rc.httpClient.CheckRedirect,
		}
	}

	// Execute the REST call
	response, err := rc.executeRestCall(client, &restRequest)
	if err != nil {
		log.Printf("Error executing REST call: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: fmt.Sprintf("REST call failed: %v", err),
		})
		return
	}

	log.Printf("REST call completed successfully: %d %s", response.StatusCode, response.Status)
	c.JSON(http.StatusOK, response)
}

func (rc *RestController) validateRequest(req *models.RestRequest) error {
	// Validate HTTP method
	method := strings.ToUpper(req.Method)
	validMethods := map[string]bool{
		"GET": true, "POST": true, "PUT": true, "DELETE": true,
		"HEAD": true, "OPTIONS": true, "PATCH": true, "TRACE": true,
	}
	if !validMethods[method] {
		return fmt.Errorf("invalid HTTP method: %s", req.Method)
	}

	// Validate URL
	parsedURL, err := url.Parse(req.URL)
	if err != nil {
		return fmt.Errorf("invalid URL: %v", err)
	}
	if parsedURL.Scheme == "" {
		return fmt.Errorf("URL must include scheme (http:// or https://)")
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("only HTTP and HTTPS schemes are supported")
	}

	// Validate timeout
	if req.Timeout < 0 || req.Timeout > 300 {
		return fmt.Errorf("timeout must be between 1 and 300 seconds")
	}

	return nil
}

func (rc *RestController) executeRestCall(client *http.Client, restRequest *models.RestRequest) (*models.RestResponse, error) {
	startTime := time.Now()

	// Prepare request body
	var bodyReader io.Reader
	if restRequest.Body != nil && (restRequest.Method == "POST" || restRequest.Method == "PUT" || restRequest.Method == "PATCH") {
		bodyBytes, err := json.Marshal(restRequest.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %v", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	// Create HTTP request
	req, err := http.NewRequest(restRequest.Method, restRequest.URL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %v", err)
	}

	// Add headers
	for key, value := range restRequest.Headers {
		req.Header.Set(key, value)
	}

	// Set default Content-Type for requests with body
	if bodyReader != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	// Set User-Agent if not provided
	if req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", "gRPC-Client-REST-Proxy/1.0")
	}

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	// Calculate timing
	totalTime := time.Since(startTime).Milliseconds()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	// Parse response body as JSON if possible, otherwise return as string
	var parsedBody interface{}
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		if err := json.Unmarshal(respBody, &parsedBody); err != nil {
			// If JSON parsing fails, return as string
			parsedBody = string(respBody)
		}
	} else {
		parsedBody = string(respBody)
	}

	// Build response
	restResponse := &models.RestResponse{
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
		Headers:    resp.Header,
		Body:       parsedBody,
		Timing: models.ResponseTiming{
			Total: totalTime,
			// Note: More detailed timing would require custom transport
			DNS:        0,
			Connection: 0,
			TLS:        0,
			FirstByte:  0,
		},
	}

	return restResponse, nil
}
