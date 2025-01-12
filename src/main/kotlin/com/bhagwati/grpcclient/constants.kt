package com.bhagwati.grpcclient

object constants {
    const val GRPC_URL = "grpcurl"
    const val GRPC_COLLECTION_LOCATION = ".grpc-client"
    const val GRPC_COLLECTION_FILE_EXTENSION = ".json"
    const val GRPC_COLLECTION_LOCATION_SAMPLE = "static/sample-data"
    object GgrcResponseStatus {
        const val SUCCESS = "success"
        const val ERROR = "error"
    }
}