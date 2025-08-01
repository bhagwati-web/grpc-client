package models

import (
	"encoding/json"
	"testing"
)

func TestGrpcRequestJSON(t *testing.T) {
	// Test JSON marshaling/unmarshaling
	request := GrpcRequest{
		Host:   "grpcb.in:443",
		Method: "addsvc.Add.Sum",
		Message: map[string]interface{}{
			"a": 2,
			"b": 3,
		},
		MetaData: map[string]string{
			"authorization": "Bearer token",
		},
	}

	// Marshal to JSON
	data, err := json.Marshal(request)
	if err != nil {
		t.Fatalf("Failed to marshal GrpcRequest: %v", err)
	}

	// Unmarshal from JSON
	var unmarshaled GrpcRequest
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal GrpcRequest: %v", err)
	}

	// Verify fields
	if unmarshaled.Host != request.Host {
		t.Errorf("Host mismatch: got %s, want %s", unmarshaled.Host, request.Host)
	}
	if unmarshaled.Method != request.Method {
		t.Errorf("Method mismatch: got %s, want %s", unmarshaled.Method, request.Method)
	}
}

func TestCollectionJSON(t *testing.T) {
	collection := Collection{
		Title: "Test Collection",
		Items: []CollectionItem{
			{
				Message: map[string]interface{}{"test": "value"},
				Host:    "localhost:9090",
				Service: "TestService",
			},
		},
	}

	// Marshal to JSON
	data, err := json.Marshal(collection)
	if err != nil {
		t.Fatalf("Failed to marshal Collection: %v", err)
	}

	// Unmarshal from JSON
	var unmarshaled Collection
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal Collection: %v", err)
	}

	// Verify fields
	if unmarshaled.Title != collection.Title {
		t.Errorf("Title mismatch: got %s, want %s", unmarshaled.Title, collection.Title)
	}
	if len(unmarshaled.Items) != len(collection.Items) {
		t.Errorf("Items length mismatch: got %d, want %d", len(unmarshaled.Items), len(collection.Items))
	}
}
