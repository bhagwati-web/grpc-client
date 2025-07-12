package com.bhagwati.grpcclient.api

import com.google.protobuf.DescriptorProtos
import io.grpc.ManagedChannel
import io.grpc.ManagedChannelBuilder
import io.grpc.reflection.v1alpha.ServerReflectionGrpc
import io.grpc.reflection.v1alpha.ServerReflectionRequest
import io.grpc.reflection.v1alpha.ServerReflectionResponse
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.*
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

@RestController
@CrossOrigin(origins = ["*"])
@RequestMapping("/metadata")
class ReflectionController {

    private val logger = LoggerFactory.getLogger(ReflectionController::class.java)
    private val reflectionCache = ConcurrentHashMap<String, CachedReflectionData>()
    private val executor = ForkJoinPool.commonPool()

    data class CachedReflectionData(
        val data: Any,
        val timestamp: Long = System.currentTimeMillis()
    ) {
        fun isExpired(): Boolean = System.currentTimeMillis() - timestamp > 300_000L // 5 minutes
    }

    // Default endpoint function
    @GetMapping
    fun defaultEndpoint(): String {
        return "Default endpoint for reflection metadata"
    }

    @GetMapping("/{host}")
    fun fetchReflectionDetails(@PathVariable host: String): Any {
        // Check cache first
        val cacheKey = "reflection_$host"
        val cached = reflectionCache[cacheKey]
        if (cached != null && !cached.isExpired()) {
            logger.info("Returning cached reflection data for: $host")
            return cached.data
        }

        val channel = createChannel(host)
        val reflectionStub = ServerReflectionGrpc.newStub(channel)

        return try {
            logger.info("Requesting reflection data for: $host")

            // Step 1: List all services with optimized timeout
            val services = listServicesOptimized(reflectionStub)
            if (services.isEmpty()) {
                return mapOf("error" to "Error Getting Service and methods for host: $host. You can correct the host address, port or check if the service is running.")
            }

            // Step 2: Get all file descriptors using batch processing
            val allFileDescriptors = getAllFileDescriptorsBatch(reflectionStub, services)

            // Step 3: Process descriptors in parallel using executor
            val servicesWithMethods = processDescriptorsInParallel(allFileDescriptors, services)

            // Cache the result
            reflectionCache[cacheKey] = CachedReflectionData(servicesWithMethods)

            servicesWithMethods

        } catch (e: Exception) {
            logger.error("Error occurred: ${e.message}", e)
            mapOf("error" to (e.message ?: "An unknown error occurred."))
        } finally {
            channel.shutdown().awaitTermination(3, TimeUnit.SECONDS)
        }
    }

    @GetMapping("/{host}/{service}/{functionInput}")
    fun fetchReflectionServiceFunctionDetails(
        @PathVariable host: String,
        @PathVariable service: String,
        @PathVariable functionInput: String
    ): Any {
        val channel = createChannel(host)
        val reflectionStub = ServerReflectionGrpc.newStub(channel)
        val request = ServerReflectionRequest.newBuilder()
            .setFileContainingSymbol(service)
            .build()

        return try {
            logger.info("Requesting reflection data for service: $service from host: $host")
            val descriptors = getReflectionData(reflectionStub, request)
            if (descriptors.isEmpty()) {
                mapOf("error" to "No reflection data received. Verify the service name.")
            } else {
                parseAndFormatDescriptors(descriptors, functionInput)
            }
        } catch (e: Exception) {
            logger.error("Error occurred: ${e.message}", e)
            mapOf("error" to (e.message ?: "An unknown error occurred."))
        } finally {
            try {
                channel.shutdown().awaitTermination(5, TimeUnit.SECONDS)
            } catch (e: InterruptedException) {
                logger.error("Error during channel shutdown: ${e.message}", e)
            }
        }
    }

    // Optimized service listing with better timeout and error handling
    private fun listServicesOptimized(reflectionStub: ServerReflectionGrpc.ServerReflectionStub): List<String> {
        val request = ServerReflectionRequest.newBuilder()
            .setListServices("")
            .build()

        val services = mutableListOf<String>()
        val completableFuture = CompletableFuture<List<String>>()

        try {
            val requestObserver = reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
                override fun onNext(response: ServerReflectionResponse) {
                    try {
                        if (response.hasListServicesResponse()) {
                            services.addAll(response.listServicesResponse.serviceList.map { it.name })
                            logger.info("Found ${response.listServicesResponse.serviceList.size} services")
                        } else if (response.hasErrorResponse()) {
                            logger.error("Server returned error: ${response.errorResponse.errorMessage}")
                            completableFuture.completeExceptionally(
                                RuntimeException("Server error: ${response.errorResponse.errorMessage}")
                            )
                        }
                    } catch (e: Exception) {
                        logger.error("Error processing response: ${e.message}", e)
                        completableFuture.completeExceptionally(e)
                    }
                }

                override fun onError(t: Throwable) {
                    logger.error("Error during listing services: ${t.message}", t)
                    when {
                        t.message?.contains("UNIMPLEMENTED") == true -> {
                            completableFuture.completeExceptionally(
                                RuntimeException("Server doesn't support gRPC reflection")
                            )
                        }
                        t.message?.contains("UNAVAILABLE") == true -> {
                            completableFuture.completeExceptionally(
                                RuntimeException("Server is unavailable or unreachable")
                            )
                        }
                        t.message?.contains("DEADLINE_EXCEEDED") == true -> {
                            completableFuture.completeExceptionally(
                                RuntimeException("Connection timeout - server may be slow or unreachable")
                            )
                        }
                        else -> {
                            completableFuture.completeExceptionally(t)
                        }
                    }
                }

                override fun onCompleted() {
                    logger.info("Service listing completed successfully with ${services.size} services")
                    completableFuture.complete(services)
                }
            })

            requestObserver.onNext(request)
            requestObserver.onCompleted()

        } catch (e: Exception) {
            logger.error("Failed to initiate reflection request: ${e.message}", e)
            completableFuture.completeExceptionally(e)
        }

        return try {
            // Increase timeout to 10 seconds for better reliability
            completableFuture.get(10, TimeUnit.SECONDS)
        } catch (e: TimeoutException) {
            logger.warn("Service listing timed out after 10 seconds - server may not support reflection or is unreachable")
            emptyList()
        } catch (e: ExecutionException) {
            logger.error("Service listing failed: ${e.cause?.message}", e.cause)
            emptyList()
        } catch (e: Exception) {
            logger.error("Unexpected error during service listing: ${e.message}", e)
            emptyList()
        }
    }

    // Batch request for all file descriptors with improved error handling
    private fun getAllFileDescriptorsBatch(
        reflectionStub: ServerReflectionGrpc.ServerReflectionStub,
        services: List<String>
    ): Map<String, List<ByteArray>> {
        val descriptorMap = ConcurrentHashMap<String, List<ByteArray>>()
        val completableFuture = CompletableFuture<Map<String, List<ByteArray>>>()
        val pendingRequests = AtomicInteger(services.size)

        if (services.isEmpty()) {
            return emptyMap()
        }

        val requestObserver = reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
            override fun onNext(response: ServerReflectionResponse) {
                if (response.hasFileDescriptorResponse()) {
                    // Since we can't get original request easily, we'll match by position or use a different approach
                    val descriptors = response.fileDescriptorResponse.fileDescriptorProtoList.map { it.toByteArray() }
                    // For now, we'll store all descriptors and let the processing handle service matching
                    descriptorMap["batch_${descriptorMap.size}"] = descriptors
                }

                if (pendingRequests.decrementAndGet() <= 0) {
                    completableFuture.complete(descriptorMap)
                }
            }

            override fun onError(t: Throwable) {
                logger.error("Error during batch file descriptor request: ${t.message}", t)
                completableFuture.completeExceptionally(t)
            }

            override fun onCompleted() {
                completableFuture.complete(descriptorMap)
            }
        })

        // Send all requests in sequence with small delays to avoid overwhelming the server
        services.forEach { service ->
            val request = ServerReflectionRequest.newBuilder()
                .setFileContainingSymbol(service)
                .build()
            requestObserver.onNext(request)
        }
        requestObserver.onCompleted()

        return try {
            completableFuture.get(15, TimeUnit.SECONDS)
        } catch (e: TimeoutException) {
            logger.warn("Batch file descriptor request timed out")
            descriptorMap
        } catch (e: Exception) {
            logger.error("Error in batch request: ${e.message}", e)
            descriptorMap
        }
    }

    // Process descriptors in parallel using CompletableFuture
    private fun processDescriptorsInParallel(
        descriptorMap: Map<String, List<ByteArray>>,
        services: List<String>
    ): List<Any> {
        val servicesWithMethods = ConcurrentLinkedQueue<Map<String, Any>>()

        // Create futures for each service processing task
        val futures = services.map { service ->
            CompletableFuture.supplyAsync({
                processServiceWithAllDescriptors(service, descriptorMap.values.flatten())
            }, executor)
        }

        // Wait for all futures to complete and collect results
        val allResults = futures.map { future ->
            try {
                future.get(10, TimeUnit.SECONDS)
            } catch (e: Exception) {
                logger.error("Error processing service descriptors: ${e.message}", e)
                emptyList<Map<String, Any>>()
            }
        }

        return allResults.flatten()
    }

    private fun processServiceWithAllDescriptors(service: String, allDescriptors: List<ByteArray>): List<Map<String, Any>> {
        val results = mutableListOf<Map<String, Any>>()

        allDescriptors.forEach { descriptor ->
            try {
                val descriptorProto = DescriptorProtos.FileDescriptorProto.parseFrom(descriptor)
                descriptorProto.serviceList.forEach { serviceProto ->
                    // Only process if this descriptor contains the service we're looking for
                    if (serviceProto.name == service || service.endsWith(".${serviceProto.name}")) {
                        results.add(mapOf(
                            "serviceName" to serviceProto.name,
                            "serviceDetails" to service,
                            "functions" to serviceProto.methodList.map {
                                mapOf(
                                    "functionName" to it.name,
                                    "detailName" to "$service.${it.name}",
                                    "inputType" to it.inputType,
                                    "outputType" to it.outputType
                                )
                            }
                        ))
                    }
                }
            } catch (e: Exception) {
                logger.debug("Skipping descriptor that doesn't match service $service: ${e.message}")
            }
        }

        return results
    }

    // Optimized single service file descriptor retrieval with caching
    private fun getFileDescriptorsForServiceOptimized(
        reflectionStub: ServerReflectionGrpc.ServerReflectionStub,
        serviceName: String
    ): List<ByteArray> {
        // Check cache first
        val cacheKey = "descriptors_$serviceName"
        val cached = reflectionCache[cacheKey]
        if (cached != null && !cached.isExpired()) {
            @Suppress("UNCHECKED_CAST")
            return cached.data as List<ByteArray>
        }

        val request = ServerReflectionRequest.newBuilder()
            .setFileContainingSymbol(serviceName)
            .build()

        val descriptors = mutableListOf<ByteArray>()
        val completableFuture = CompletableFuture<List<ByteArray>>()

        reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
            override fun onNext(response: ServerReflectionResponse) {
                if (response.hasFileDescriptorResponse()) {
                    descriptors.addAll(response.fileDescriptorResponse.fileDescriptorProtoList.map { it.toByteArray() })
                }
            }

            override fun onError(t: Throwable) {
                logger.error("Error during fetching file descriptors: ${t.message}", t)
                completableFuture.completeExceptionally(t)
            }

            override fun onCompleted() {
                completableFuture.complete(descriptors)
            }
        }).onNext(request)

        return try {
            val result = completableFuture.get(10, TimeUnit.SECONDS)
            // Cache the result
            reflectionCache[cacheKey] = CachedReflectionData(result)
            result
        } catch (e: TimeoutException) {
            logger.warn("File descriptor request timed out for service: $serviceName")
            emptyList()
        } catch (e: Exception) {
            logger.error("Error getting file descriptors: ${e.message}", e)
            emptyList()
        }
    }

    private fun createChannel(host: String): ManagedChannel {
        logger.info("Creating gRPC channel for host: $host")
        // Split the host and port from the full address string
        val (hostname, port) = host.split(":").let { it[0] to it[1].toInt() }

        // Create the channel builder with the appropriate security setting based on the port
        val channelBuilder = ManagedChannelBuilder.forAddress(hostname, port)

        return if (port == 443) {
            channelBuilder.useTransportSecurity().build()
        } else {
            channelBuilder.usePlaintext().build()
        }

    }

    private fun getReflectionData(
        reflectionStub: ServerReflectionGrpc.ServerReflectionStub,
        request: ServerReflectionRequest
    ): List<ByteArray> {
        val latch = CountDownLatch(1)
        val responseBuilder = mutableListOf<ByteArray>()

        val requestObserver = reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
            override fun onNext(response: ServerReflectionResponse) {
                logger.debug("Received reflection response")
                response.fileDescriptorResponse?.fileDescriptorProtoList?.forEach {
                    responseBuilder.add(it.toByteArray())
                }
            }

            override fun onError(t: Throwable) {
                logger.error("Error during reflection request: ${t.message}", t)
                latch.countDown()
            }

            override fun onCompleted() {
                logger.info("Reflection request completed")
                latch.countDown()
            }
        })

        requestObserver.onNext(request)
        requestObserver.onCompleted()

        if (!latch.await(30, TimeUnit.SECONDS)) {
            throw TimeoutException("Reflection request timed out.")
        }

        return responseBuilder
    }

    private fun parseAndFormatDescriptors(descriptors: List<ByteArray>, functionName: String): Any {
        val parsedDescriptors = descriptors.mapNotNull { descriptorBytes ->
            parseDescriptor(descriptorBytes)
        }

        // Return the formatted response, so that UI can understand it
        return processReflectionResponse(parsedDescriptors, functionName)
        // return parsedDescriptors
    }

    // Let's parse the descriptor and extract the necessary information
    private fun parseDescriptor(descriptorBytes: ByteArray): Map<String, Any>? {
        return runCatching {
            val descriptorProto = DescriptorProtos.FileDescriptorProto.parseFrom(descriptorBytes)
            logger.debug("Parsed descriptor: ${descriptorProto.name}")

            mapOf(
                "name" to descriptorProto.name,
                "version" to descriptorProto.syntax,
                "package" to descriptorProto.`package`,
                "isMessage" to descriptorProto.messageTypeList.isNotEmpty(),
                "enumTypes" to extractEnumFromFile(descriptorProto, descriptorProto.`package`),
                "isEnum" to descriptorProto.enumTypeList.isNotEmpty(),
                "messageTypes" to descriptorProto.messageTypeList.map {
                    extractMessageTypeInfo(it, descriptorProto.`package`)
                }
            )
        }.onFailure { e ->
            logger.error("Failed to parse descriptor: ${e.message}", e)
        }.getOrNull()
    }

    // Let's read the parent object and extract the message type information
    private fun extractMessageTypeInfo(
        messageType: DescriptorProtos.DescriptorProto,
        packageName: String
    ): Map<String, Any> {
        val enumPackagePrefix = "$packageName.${messageType.name}"
        val fullMessageName = ".$enumPackagePrefix"
        return mapOf(
            "message" to fullMessageName,
            "enumTypes" to extractEnumFromField(messageType, enumPackagePrefix),
            "fields" to extractFieldInformation(messageType.fieldList),
            "nestedTypes" to messageType.nestedTypeList.map { extractNestedTypeInfo(it, enumPackagePrefix) }
        )
    }

    // Extract the nested field information from the messageType of proto
    // todo we can make it recursive to extract nested nested types
    private fun extractNestedTypeInfo(
        nestedType: DescriptorProtos.DescriptorProto,
        parentMessage: String
    ): Map<String, Any> {
        val enumPackagePrefix = "$parentMessage.${nestedType.name}"
        val fullNestedMessageName = ".$enumPackagePrefix"
        return mapOf(
            "name" to nestedType.name,
            "message" to fullNestedMessageName,
            "enumTypes" to extractEnumFromField(nestedType, enumPackagePrefix),
            "isMessage" to nestedType.fieldList.isNotEmpty(),
            "isEnum" to nestedType.enumTypeList.isNotEmpty(),
            "fields" to extractFieldInformation(nestedType.fieldList)
        )
    }

    // Extract the field information from the messageType of proto
    fun extractFieldInformation(fields: List<DescriptorProtos.FieldDescriptorProto>): List<Map<String, Any>> {
        return fields.map { field ->
            mapOf(
                "name" to field.name,
                "type" to field.type.name,
                "typeName" to field.typeName,
                "isMessage" to (field.type == DescriptorProtos.FieldDescriptorProto.Type.TYPE_MESSAGE),
                "isEnum" to (field.type == DescriptorProtos.FieldDescriptorProto.Type.TYPE_ENUM),
                "isArray" to (field.label == DescriptorProtos.FieldDescriptorProto.Label.LABEL_REPEATED),
                "description" to "${field.type.name} ${field.name} = ${field.number};"
            )
        }
    }

    // Extract the enum information from the field
    fun extractEnumFromField(proto: DescriptorProtos.DescriptorProto, messageName: String): List<Map<String, Any>> {
        return proto.enumTypeList.map { enum ->
            mapOf(
                "name" to ".${messageName}.${enum.name}",
                "values" to enum.valueList.map { value ->
                    mapOf("name" to value.name, "number" to value.number)
                }
            )
        }
    }

    // Extract the enum information from the proto file
    fun extractEnumFromFile(
        fileProto: DescriptorProtos.FileDescriptorProto,
        packageName: String
    ): List<Map<String, Any>> {
        return fileProto.enumTypeList.map { fileEnum ->
            mapOf(
                "name" to ".${packageName}.${fileEnum.name}",
                "values" to fileEnum.valueList.map { value ->
                    mapOf("name" to value.name, "number" to value.number)
                }
            )
        }
    }

    fun processReflectionResponse(response: List<Map<String, Any>>, rootMessageName: String): Map<String, Any> {
        val messages = mutableMapOf<String, Map<String, Any>>()
        val enums = mutableMapOf<String, List<Map<String, Any>>>()

        // Step 1: Collect all messages and enums
        response.forEach { proto ->
            val messageTypes = proto["messageTypes"] as List<Map<String, Any>>
            val enumTypes = proto["enumTypes"] as List<Map<String, Any>>

            messageTypes.forEach { message ->
                messages[message["message"] as String] = message
            }

            enumTypes.forEach { enumType ->
                val enumName = enumType["name"] as String
                enums[enumName] = enumType["values"] as List<Map<String, Any>>
            }

            messageTypes.forEach { message ->

                val fieldEnum = message["enumTypes"] as List<Map<String, Any>>
                fieldEnum.forEach { enumType ->
                    val enumName = enumType["name"] as String
                    enums[enumName] = enumType["values"] as List<Map<String, Any>>
                }

                val nestedTypes = message["nestedTypes"] as List<Map<String, Any>>
                nestedTypes.forEach { nestedType ->
                    val nestedMessageName = nestedType["message"] as String
                    messages[nestedMessageName] = nestedType

                    val nestedEnums = nestedType["enumTypes"] as List<Map<String, Any>>
                    nestedEnums.forEach { enumType ->
                        val enumName = enumType["name"] as String
                        enums[enumName] = enumType["values"] as List<Map<String, Any>>
                    }
                }

            }
        }

        // Step 2: Recursive function to resolve a message and its dependencies
        fun resolveMessage(messageName: String, visited: MutableSet<String> = mutableSetOf()): Map<String, Any> {
            if (visited.contains(messageName)) {
                return mapOf("message" to messageName, "fields" to "Cyclic dependency detected")
            }

            visited.add(messageName)
            val message = messages[messageName] ?: return mapOf("message" to messageName, "fields" to emptyList<Any>())

            val fields = message["fields"] as List<Map<String, Any>>

            val resolvedFields = fields.map { field ->
                val fieldTypeName = field["typeName"] as String

                when (field["type"]) {
                    "TYPE_MESSAGE" -> {
                        val nestedMessage = resolveMessage(fieldTypeName, visited)
                        field + ("nestedMessage" to nestedMessage)
                    }

                    "TYPE_ENUM" -> {
                        val enumValues = enums[fieldTypeName]
                        field + ("enumValues" to enumValues)
                    }

                    else -> field
                }
            }

            visited.remove(messageName)
            return mapOf("message" to messageName, "fields" to resolvedFields)
        }

        // Step 3: Process the root message and return its structured dependencies
        return resolveMessage(rootMessageName)
    }

}
