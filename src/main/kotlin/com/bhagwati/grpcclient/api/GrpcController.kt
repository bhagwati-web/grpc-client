package com.bhagwati.grpcclient.api

import com.bhagwati.grpcclient.model.GrpcRequest
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.google.protobuf.DynamicMessage
import com.google.protobuf.util.JsonFormat
import com.google.protobuf.DescriptorProtos
import com.google.protobuf.Descriptors
import io.grpc.ManagedChannel
import io.grpc.ManagedChannelBuilder
import io.grpc.MethodDescriptor
import io.grpc.CallOptions
import io.grpc.Metadata
import io.grpc.reflection.v1alpha.ServerReflectionGrpc
import io.grpc.reflection.v1alpha.ServerReflectionRequest
import io.grpc.reflection.v1alpha.ServerReflectionResponse
import io.grpc.stub.StreamObserver
import io.grpc.stub.ClientCalls
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.*
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

@CrossOrigin(origins = ["*"])
@RestController
@RequestMapping("/grpc")
class GrpcController {

    private val logger = LoggerFactory.getLogger(GrpcController::class.java)
    private val objectMapper = jacksonObjectMapper()

    @GetMapping
    fun defaultEndpoint(): String {
        return "Default endpoint for grpc"
    }

    @PostMapping("/call")
    fun makeGrpcCall(@RequestBody grpcRequest: GrpcRequest, @RequestHeader allHeaders: Map<String, String>): Any {
        return try {
            logger.info("Making gRPC call to ${grpcRequest.host} for method ${grpcRequest.method}")

            val channel = createChannel(grpcRequest.host)
            try {
                val result = executeGrpcCall(channel, grpcRequest, allHeaders)
                logger.info("gRPC call completed successfully")
                result
            } finally {
                channel.shutdown().awaitTermination(5, TimeUnit.SECONDS)
            }
        } catch (e: Exception) {
            logger.error("Error making gRPC call: ${e.message}", e)
            mapOf("error" to (e.message ?: "An unknown error occurred"))
        }
    }

    private fun createChannel(host: String): ManagedChannel {
        logger.info("Creating gRPC channel for host: $host")
        val (hostname, port) = host.split(":").let { it[0] to it[1].toInt() }

        val channelBuilder = ManagedChannelBuilder.forAddress(hostname, port)

        return if (port == 443) {
            channelBuilder.useTransportSecurity().build()
        } else {
            channelBuilder.usePlaintext().build()
        }
    }

    private fun executeGrpcCall(
        channel: ManagedChannel,
        grpcRequest: GrpcRequest,
        allHeaders: Map<String, String>
    ): Any {
        // Get method descriptor
        val methodDescriptor = getMethodDescriptor(channel, grpcRequest.method)
            ?: return mapOf("error" to "Method ${grpcRequest.method} not found")

        // Parse request message
        val requestMessage = parseRequestMessage(methodDescriptor.requestMarshaller as DynamicMessageMarshaller, grpcRequest.message ?: emptyMap<String, Any>())
            ?: return mapOf("error" to "Failed to parse request message")

        // Create metadata
        val metadata = createMetadata(grpcRequest, allHeaders)

        // Make the call
        return makeUnaryCall(channel, methodDescriptor, requestMessage, metadata)
    }

    private fun getMethodDescriptor(channel: ManagedChannel, methodName: String): MethodDescriptor<DynamicMessage, DynamicMessage>? {
        try {
            val reflectionStub = ServerReflectionGrpc.newStub(channel)

            // Parse method name: "addsvc.Add.Sum" -> service="addsvc.Add", method="Sum"
            val serviceName = methodName.substringBeforeLast(".")
            val methodShortName = methodName.substringAfterLast(".")

            logger.info("Looking for service: '$serviceName', method: '$methodShortName'")

            // First, list all available services to see what's actually on the server
            val availableServices = listAllServices(reflectionStub)
            logger.info("Available services on server: $availableServices")

            // Try to find a matching service name
            val actualServiceName = findMatchingServiceName(availableServices, serviceName)
            if (actualServiceName == null) {
                logger.error("Service '$serviceName' not found. Available services: $availableServices")
                return null
            }

            logger.info("Using actual service name: '$actualServiceName'")

            // Get file descriptors for the actual service name
            val fileDescriptors = getFileDescriptorsForService(reflectionStub, actualServiceName)

            if (fileDescriptors.isEmpty()) {
                logger.error("No file descriptors found for service: $actualServiceName")
                return null
            }

            // Build method descriptor from reflection data
            return buildMethodDescriptor(fileDescriptors, actualServiceName, methodShortName)
        } catch (e: Exception) {
            logger.error("Error getting method descriptor: ${e.message}", e)
            return null
        }
    }

    private fun listAllServices(reflectionStub: ServerReflectionGrpc.ServerReflectionStub): List<String> {
        val request = ServerReflectionRequest.newBuilder()
            .setListServices("")
            .build()

        val services = mutableListOf<String>()
        val completableFuture = CompletableFuture<List<String>>()

        try {
            val requestObserver = reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
                override fun onNext(response: ServerReflectionResponse) {
                    logger.info("Received reflection response: ${response}")
                    if (response.hasListServicesResponse()) {
                        val serviceNames = response.listServicesResponse.serviceList.map { it.name }
                        services.addAll(serviceNames)
                        logger.info("Found services: $serviceNames")
                    } else if (response.hasErrorResponse()) {
                        logger.error("Server reflection error: ${response.errorResponse.errorMessage}")
                        completableFuture.completeExceptionally(
                            RuntimeException("Server reflection error: ${response.errorResponse.errorMessage}")
                        )
                    } else {
                        logger.warn("Unexpected response type: ${response}")
                    }
                }

                override fun onError(t: Throwable) {
                    logger.error("Error during listing services: ${t.message}", t)
                    completableFuture.completeExceptionally(t)
                }

                override fun onCompleted() {
                    logger.info("Service listing completed with ${services.size} services")
                    completableFuture.complete(services)
                }
            })

            requestObserver.onNext(request)
            requestObserver.onCompleted()

        } catch (e: Exception) {
            logger.error("Failed to initiate service listing: ${e.message}", e)
            completableFuture.completeExceptionally(e)
        }

        return try {
            completableFuture.get(15, TimeUnit.SECONDS) // Increased timeout
        } catch (e: TimeoutException) {
            logger.warn("Service listing timed out after 15 seconds")
            emptyList()
        } catch (e: Exception) {
            logger.error("Error listing services: ${e.message}", e)
            emptyList()
        }
    }

    private fun findMatchingServiceName(availableServices: List<String>, requestedServiceName: String): String? {
        // Try exact match first
        if (availableServices.contains(requestedServiceName)) {
            return requestedServiceName
        }

        // Try matching just the service name part (e.g., "Add" from "addsvc.Add")
        val shortServiceName = requestedServiceName.substringAfterLast(".")
        if (availableServices.contains(shortServiceName)) {
            return shortServiceName
        }

        // Try case-insensitive match
        val caseInsensitiveMatch = availableServices.find {
            it.equals(requestedServiceName, ignoreCase = true) ||
                    it.equals(shortServiceName, ignoreCase = true)
        }
        if (caseInsensitiveMatch != null) {
            return caseInsensitiveMatch
        }

        // Try partial match (contains)
        val partialMatch = availableServices.find {
            it.contains(shortServiceName, ignoreCase = true) ||
                    shortServiceName.contains(it, ignoreCase = true)
        }

        return partialMatch
    }

    private fun getFileDescriptorsForService(
        reflectionStub: ServerReflectionGrpc.ServerReflectionStub,
        serviceName: String
    ): List<ByteArray> {
        logger.info("Requesting file descriptors for service: '$serviceName'")

        val request = ServerReflectionRequest.newBuilder()
            .setFileContainingSymbol(serviceName)
            .build()

        val descriptors = mutableListOf<ByteArray>()
        val completableFuture = CompletableFuture<List<ByteArray>>()

        try {
            val requestObserver = reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
                override fun onNext(response: ServerReflectionResponse) {
                    logger.info("Received file descriptor response: ${response}")
                    if (response.hasFileDescriptorResponse()) {
                        val newDescriptors = response.fileDescriptorResponse.fileDescriptorProtoList.map { it.toByteArray() }
                        descriptors.addAll(newDescriptors)
                        logger.info("Received ${newDescriptors.size} file descriptors")
                    } else if (response.hasErrorResponse()) {
                        logger.error("Server file descriptor error: ${response.errorResponse.errorMessage}")
                        completableFuture.completeExceptionally(
                            RuntimeException("Server file descriptor error: ${response.errorResponse.errorMessage}")
                        )
                    } else {
                        logger.warn("Unexpected file descriptor response type: ${response}")
                    }
                }

                override fun onError(t: Throwable) {
                    logger.error("Error during fetching file descriptors: ${t.message}", t)
                    completableFuture.completeExceptionally(t)
                }

                override fun onCompleted() {
                    logger.info("File descriptor request completed with ${descriptors.size} descriptors")
                    completableFuture.complete(descriptors)
                }
            })

            requestObserver.onNext(request)
            requestObserver.onCompleted()

        } catch (e: Exception) {
            logger.error("Failed to initiate file descriptor request: ${e.message}", e)
            completableFuture.completeExceptionally(e)
        }

        return try {
            completableFuture.get(15, TimeUnit.SECONDS) // Increased timeout
        } catch (e: TimeoutException) {
            logger.warn("File descriptor request timed out for service: $serviceName after 15 seconds")
            emptyList()
        } catch (e: Exception) {
            logger.error("Error getting file descriptors: ${e.message}", e)
            emptyList()
        }
    }

    private fun buildMethodDescriptor(
        fileDescriptorBytes: List<ByteArray>,
        serviceName: String,
        methodShortName: String
    ): MethodDescriptor<DynamicMessage, DynamicMessage>? {
        try {
            // Parse file descriptors with proper dependency resolution
            val fileDescriptors = buildFileDescriptorsWithDependencies(fileDescriptorBytes)

            // Log all available services for debugging
            logger.info("Available services:")
            for (fileDescriptor in fileDescriptors) {
                for (service in fileDescriptor.services) {
                    logger.info("  Service: ${service.fullName} (name: ${service.name})")
                    for (method in service.methods) {
                        logger.info("    Method: ${method.name}")
                    }
                }
            }

            // Find the method with improved matching logic
            for (fileDescriptor in fileDescriptors) {
                for (service in fileDescriptor.services) {
                    // Try multiple matching strategies:
                    val isServiceMatch = service.fullName == serviceName ||
                            service.name == serviceName ||
                            service.name == serviceName.substringAfterLast(".") ||
                            service.fullName.equals(serviceName, ignoreCase = true) ||
                            service.name.equals(serviceName.substringAfterLast("."), ignoreCase = true)

                    if (isServiceMatch) {
                        logger.info("Found matching service: ${service.fullName}")
                        for (method in service.methods) {
                            if (method.name == methodShortName || method.name.equals(methodShortName, ignoreCase = true)) {
                                logger.info("Found matching method: ${method.name}")
                                return createMethodDescriptor(method)
                            }
                        }
                    }
                }
            }

            logger.error("Method '$methodShortName' not found in service '$serviceName'")
            return null

        } catch (e: Exception) {
            logger.error("Error building method descriptor: ${e.message}", e)
            return null
        }
    }

    private fun buildFileDescriptorsWithDependencies(fileDescriptorBytes: List<ByteArray>): List<Descriptors.FileDescriptor> {
        val fileDescriptors = mutableListOf<Descriptors.FileDescriptor>()
        val descriptorProtos = mutableListOf<DescriptorProtos.FileDescriptorProto>()
        val builtDescriptors = mutableMapOf<String, Descriptors.FileDescriptor>()

        // First, parse all the proto files
        fileDescriptorBytes.forEach { bytes ->
            val proto = DescriptorProtos.FileDescriptorProto.parseFrom(bytes)
            descriptorProtos.add(proto)
        }

        logger.info("Parsed ${descriptorProtos.size} file descriptor protos")

        // Build descriptors in dependency order
        val remainingProtos = descriptorProtos.toMutableList()
        val maxIterations = descriptorProtos.size * 2 // Prevent infinite loops
        var iterations = 0

        while (remainingProtos.isNotEmpty() && iterations < maxIterations) {
            iterations++
            val iterator = remainingProtos.iterator()
            var progressMade = false

            while (iterator.hasNext()) {
                val proto = iterator.next()

                // Check if all dependencies are already built
                val dependencies = proto.dependencyList.mapNotNull { depName ->
                    builtDescriptors[depName]
                }

                // If all dependencies are satisfied, build this descriptor
                if (dependencies.size == proto.dependencyList.size) {
                    try {
                        val fileDescriptor = Descriptors.FileDescriptor.buildFrom(proto, dependencies.toTypedArray())
                        fileDescriptors.add(fileDescriptor)
                        builtDescriptors[proto.name] = fileDescriptor
                        iterator.remove()
                        progressMade = true
                        logger.debug("Built file descriptor: ${proto.name}")
                    } catch (e: Exception) {
                        logger.warn("Failed to build descriptor for ${proto.name}: ${e.message}")
                        // Don't remove from iterator, might succeed in next iteration
                    }
                }
            }

            // If no progress was made in this iteration, we might have circular dependencies
            // or missing dependencies. Try to build remaining descriptors without dependencies.
            if (!progressMade && remainingProtos.isNotEmpty()) {
                logger.warn("No progress made, attempting to build remaining descriptors without full dependencies")
                val proto = remainingProtos.removeFirst()
                try {
                    // Try to build with available dependencies only
                    val availableDeps = proto.dependencyList.mapNotNull { builtDescriptors[it] }
                    val fileDescriptor = Descriptors.FileDescriptor.buildFrom(proto, availableDeps.toTypedArray())
                    fileDescriptors.add(fileDescriptor)
                    builtDescriptors[proto.name] = fileDescriptor
                    logger.debug("Built file descriptor with partial dependencies: ${proto.name}")
                } catch (e: Exception) {
                    logger.error("Failed to build descriptor ${proto.name} even with partial dependencies: ${e.message}")
                    // Skip this descriptor
                }
            }
        }

        if (remainingProtos.isNotEmpty()) {
            logger.warn("Could not build ${remainingProtos.size} file descriptors due to dependency issues")
            remainingProtos.forEach { proto ->
                logger.warn("Unresolved descriptor: ${proto.name}, dependencies: ${proto.dependencyList}")
            }
        }

        logger.info("Successfully built ${fileDescriptors.size} file descriptors")
        return fileDescriptors
    }

    private fun createMethodDescriptor(
        method: Descriptors.MethodDescriptor
    ): MethodDescriptor<DynamicMessage, DynamicMessage> {
        return MethodDescriptor.newBuilder<DynamicMessage, DynamicMessage>()
            .setType(MethodDescriptor.MethodType.UNARY)
            .setFullMethodName(MethodDescriptor.generateFullMethodName(method.service.fullName, method.name))
            .setRequestMarshaller(DynamicMessageMarshaller(method.inputType))
            .setResponseMarshaller(DynamicMessageMarshaller(method.outputType))
            .build()
    }

    private fun parseRequestMessage(
        marshaller: DynamicMessageMarshaller,
        message: Any
    ): DynamicMessage? {
        return try {
            val jsonString = objectMapper.writeValueAsString(message)
            val builder = DynamicMessage.newBuilder(marshaller.messageDescriptor)
            JsonFormat.parser().merge(jsonString, builder)
            builder.build()
        } catch (e: Exception) {
            logger.error("Error parsing request message: ${e.message}", e)
            null
        }
    }

    private fun createMetadata(grpcRequest: GrpcRequest, allHeaders: Map<String, String>): Metadata {
        val metadata = Metadata()

        // Add metadata from request
        grpcRequest.metaData?.forEach { metaMap ->
            metaMap.forEach { (key, value) ->
                metadata.put(Metadata.Key.of(key, Metadata.ASCII_STRING_MARSHALLER), value.toString())
            }
        }

        // Add authorization header if present
        val authHeader = allHeaders["authorization"]
        if (authHeader != null && grpcRequest.metaData?.none { it.containsKey("authorization") } == true) {
            metadata.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER), authHeader)
        }

        return metadata
    }

    private fun makeUnaryCall(
        channel: ManagedChannel,
        methodDescriptor: MethodDescriptor<DynamicMessage, DynamicMessage>,
        request: DynamicMessage,
        metadata: Metadata
    ): Any {
        return try {
            logger.info("Making gRPC call with metadata keys: ${metadata.keys().map { it.toString() }}")

            // Create an interceptor to add the metadata to the call
            val interceptor = object : io.grpc.ClientInterceptor {
                override fun <ReqT, RespT> interceptCall(
                    method: MethodDescriptor<ReqT, RespT>,
                    callOptions: CallOptions,
                    next: io.grpc.Channel
                ): io.grpc.ClientCall<ReqT, RespT> {
                    return object : io.grpc.ForwardingClientCall.SimpleForwardingClientCall<ReqT, RespT>(next.newCall(method, callOptions)) {
                        override fun start(responseListener: Listener<RespT>, headers: Metadata) {
                            headers.merge(metadata) // Merge our custom metadata
                            super.start(responseListener, headers)
                        }
                    }
                }
            }

            // Create a new channel with the interceptor
            val interceptedChannel = io.grpc.ClientInterceptors.intercept(channel, interceptor)

            // Use the standard blocking unary call on the new channel
            val response = ClientCalls.blockingUnaryCall(
                interceptedChannel, // Use the channel with the interceptor
                methodDescriptor,
                CallOptions.DEFAULT.withDeadlineAfter(30, TimeUnit.SECONDS),
                request
            )

            // Convert response to JSON
            val jsonResponse = JsonFormat.printer().print(response)
            objectMapper.readValue(jsonResponse, Map::class.java)

        } catch (e: Exception) {
            logger.error("Error making unary call: ${e.message}", e)
            mapOf("error" to "gRPC call failed: ${e.message}")
        }
    }

    // Custom marshaller for DynamicMessage
    class DynamicMessageMarshaller(
        val messageDescriptor: Descriptors.Descriptor
    ) : MethodDescriptor.Marshaller<DynamicMessage> {

        override fun stream(value: DynamicMessage): java.io.InputStream {
            return value.toByteArray().inputStream()
        }

        override fun parse(stream: java.io.InputStream): DynamicMessage {
            return DynamicMessage.parseFrom(messageDescriptor, stream.readBytes())
        }
    }
}