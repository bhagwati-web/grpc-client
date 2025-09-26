package constants

import "grpc-client/models"

const (
	GrpcCollectionLocation      = ".grpc-client"
	GrpcCollectionFileExtension = ".json"
	GrpcCollectionLocationSample = "static/sample-data"
	
	ResponseStatusSuccess = "success"
	ResponseStatusError   = "error"
)

// SampleData represents the sample data collections
var SampleData = []models.Collection{
	{
		Title: "grpcb",
		Items: []models.CollectionItem{
			{
				Message: map[string]interface{}{
					"a": 2,
					"b": 3,
				},
				MetaData:    nil,
				Host:        "grpcb.in:443",
				Service:     "addsvc.Add",
				ServiceName: "Add",
				RequestName: "Sum",
			},
			{
				Message: map[string]interface{}{
					"a": "a",
					"b": "b",
				},
				MetaData:    nil,
				Host:        "grpcb.in:443",
				Service:     "addsvc.Add",
				ServiceName: "Add",
				RequestName: "Concat",
			},
		},
	},
}
