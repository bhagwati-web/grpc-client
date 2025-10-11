package controllers

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	reflectpb "google.golang.org/grpc/reflection/grpc_reflection_v1alpha"
)

type ConnectionStrategy struct {
	Target   string
	Creds    credentials.TransportCredentials
	CredType string
}

// CreateFlexibleConnection creates a gRPC connection with multiple fallback strategies
func CreateFlexibleConnection(host string) (*grpc.ClientConn, error) {
	log.Printf("Creating flexible gRPC connection for host: %s", host)

	// Normalize the host (remove protocol prefixes)
	normalizedHost := normalizeHost(host)

	log.Printf("Creating flexible gRPC connection for normalizedHost: %s", normalizedHost)

	// Try different connection strategies
	strategies := getConnectionStrategies(normalizedHost)
	
	var lastErr error
	for i, strategy := range strategies {
		log.Printf("Attempting connection strategy %d/%d: %s with %s credentials", 
			i+1, len(strategies), strategy.Target, strategy.CredType)
		
		conn, err := grpc.Dial(strategy.Target,
			grpc.WithTransportCredentials(strategy.Creds),
			grpc.WithTimeout(15*time.Second),
		)
		
		if err != nil {
			log.Printf("Strategy %d failed: %v", i+1, err)
			lastErr = err
			continue
		}
		
		// Test the connection by trying to create a reflection client
		if testConnection(conn) {
			log.Printf("Successfully connected using strategy %d: %s", i+1, strategy.Target)
			return conn, nil
		}
		
		conn.Close()
		lastErr = fmt.Errorf("connection established but reflection failed")
	}
	
	return nil, fmt.Errorf("all connection strategies failed, last error: %v", lastErr)
}

func normalizeHost(host string) string {
	// Remove protocol prefixes
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "grpc://")
	host = strings.TrimPrefix(host, "grpcs://")
	
	return host
}

func getConnectionStrategies(host string) []ConnectionStrategy {
	var strategies []ConnectionStrategy
	
	// Check if host already has a port
	parts := strings.Split(host, ":")
	
	if len(parts) == 2 {
		// Host already has a port
		port, err := strconv.Atoi(parts[1])
		if err == nil {
			hostname := parts[0]
			
			// Try with the specified port first
			if port == 443 {
				// For port 443, try TLS first, then insecure
				strategies = append(strategies, ConnectionStrategy{
					Target:   host,
					Creds:    credentials.NewTLS(&tls.Config{}),
					CredType: "TLS",
				})
				strategies = append(strategies, ConnectionStrategy{
					Target:   host,
					Creds:    insecure.NewCredentials(),
					CredType: "insecure",
				})
			} else {
				// For other ports, try insecure first, then TLS
				strategies = append(strategies, ConnectionStrategy{
					Target:   host,
					Creds:    insecure.NewCredentials(),
					CredType: "insecure",
				})
				strategies = append(strategies, ConnectionStrategy{
					Target:   host,
					Creds:    credentials.NewTLS(&tls.Config{}),
					CredType: "TLS",
				})
			}
			
			// Also try port 443 if not already specified
			if port != 443 {
				strategies = append(strategies, ConnectionStrategy{
					Target:   hostname + ":443",
					Creds:    credentials.NewTLS(&tls.Config{}),
					CredType: "TLS",
				})
				strategies = append(strategies, ConnectionStrategy{
					Target:   hostname + ":443",
					Creds:    insecure.NewCredentials(),
					CredType: "insecure",
				})
			}
		}
	} else {
		// No port specified - handle known services and common patterns
		hostname := host
		
		// Special handling for known gRPC services
		if isKnownSecureGrpcService(hostname) {
			// For known secure services (like grpcb.in), try 443 with TLS first
			strategies = append(strategies, ConnectionStrategy{
				Target:   hostname + ":443",
				Creds:    credentials.NewTLS(&tls.Config{}),
				CredType: "TLS",
			})
		}
		
		// Try common gRPC ports in order of likelihood
		commonPorts := []struct {
			port string
			tls  bool
		}{
			{"443", true},   // HTTPS/gRPC-Web (most common for public services)
			{"9090", false}, // Common gRPC port (unencrypted)
			{"443", false},  // Sometimes 443 without TLS
			{"50051", false}, // Default gRPC port
			{"8080", false}, // Alternative HTTP
			{"80", false},   // HTTP (least likely for gRPC)
		}
		
		for _, portConfig := range commonPorts {
			target := hostname + ":" + portConfig.port
			
			// Skip if we already added this combination for known services
			if isKnownSecureGrpcService(hostname) && portConfig.port == "443" && portConfig.tls {
				continue
			}
			
			if portConfig.tls {
				strategies = append(strategies, ConnectionStrategy{
					Target:   target,
					Creds:    credentials.NewTLS(&tls.Config{}),
					CredType: "TLS",
				})
			} else {
				strategies = append(strategies, ConnectionStrategy{
					Target:   target,
					Creds:    insecure.NewCredentials(),
					CredType: "insecure",
				})
			}
		}
	}
	
	return strategies
}

// isKnownSecureGrpcService checks if the hostname is a known secure gRPC service
func isKnownSecureGrpcService(hostname string) bool {
	knownServices := []string{
		"grpcb.in",
		"buf.build",
		"connect.build",
		"grpc.dev",
	}
	
	for _, service := range knownServices {
		if strings.Contains(hostname, service) {
			return true
		}
	}
	
	return false
}

func testConnection(conn *grpc.ClientConn) bool {
	// Test the connection by trying to create a reflection client and list services
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	refClient := grpcreflect.NewClient(ctx, reflectpb.NewServerReflectionClient(conn))
	defer refClient.Reset()
	
	services, err := refClient.ListServices()
	if err != nil {
		log.Printf("Connection test failed - could not list services: %v", err)
		return false
	}
	
	log.Printf("Connection test passed - found %d services", len(services))
	return true
}
