package com.bhagwati.grpcclient


object constants {
    const val GRPC_URL = "/opt/homebrew/bin/grpcurl" // Use absolute path to grpcurl
    const val GRPC_COLLECTION_LOCATION = ".grpc-client"
    const val GRPC_COLLECTION_FILE_EXTENSION = ".json"
    const val GRPC_COLLECTION_LOCATION_SAMPLE = "static/sample-data"
    val SAMPLE_DATA = listOf(mapOf(
        "title" to "grpcb",
        "items" to listOf(
            mapOf(
                "message" to mapOf("a" to 2, "b" to 3),
                "metaData" to null,
                "host" to "grpcb.in:443",
                "service" to "addsvc.Add",
                "serviceName" to "Add",
                "requestName" to "Sum"
            ),
            mapOf(
                "message" to mapOf("a" to "a", "b" to "b"),
                "metaData" to null,
                "host" to "grpcb.in:443",
                "service" to "addsvc.Add",
                "serviceName" to "Add",
                "requestName" to "Concat"
            )
        )
    ))

    object GgrcResponseStatus {
        const val SUCCESS = "success"
        const val ERROR = "error"
    }
}
