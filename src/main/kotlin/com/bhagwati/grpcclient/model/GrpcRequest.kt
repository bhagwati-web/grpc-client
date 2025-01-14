package com.bhagwati.grpcclient.model

class GrpcRequest {
    var host: String = ""
    var method: String = ""
    var message: Any? = null
    var metaData: List<Map<String, String>>? = null
}