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
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

@RestController
@CrossOrigin(origins = ["*"])
@RequestMapping("/metadata")
class ReflectionController {

    private val logger = LoggerFactory.getLogger(ReflectionController::class.java)

    // Default endpoint function
    @GetMapping
    fun defaultEndpoint(): String {
        return "Default endpoint for reflection metadata"
    }

    @GetMapping("/{host}")
    fun fetchReflectionDetails(@PathVariable host: String): Any {
        val channel = createChannel(host)
        val reflectionStub = ServerReflectionGrpc.newStub(channel)

        return try {
            logger.info("Requesting reflection data for: $host")

            // Step 1: List all services
            val services = listServices(reflectionStub)
            if (services.isEmpty()) {
                return mapOf("error" to "Error Getting Service and methods for host:  $host. You can correct the host address, port or check if the service is running.")
            }

            // Step 2: Request file descriptors for each service
            val servicesWithMethods: MutableList<Any> = mutableListOf()
            services.forEach { service ->
                val fileDescriptors = getFileDescriptorsForService(reflectionStub, service)
                fileDescriptors.forEach { descriptor ->
                    val descriptorProto = DescriptorProtos.FileDescriptorProto.parseFrom(descriptor)
                    descriptorProto.serviceList.forEach { serviceProto ->
                        servicesWithMethods.add(mapOf(
                            "serviceName" to serviceProto.name,
                            "serviceDetails" to service,
                            "functions" to serviceProto.methodList.map {
                                mapOf(
                                    "functionName" to it.name,
                                    "detailName" to service + "." + it.name,
                                    "inputType" to it.inputType,
                                    "outputType" to it.outputType
                                )
                            }
                        ))
                    }
                }
            }

            // Return the services with their methods
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

    // Helper function to list all services
    private fun listServices(reflectionStub: ServerReflectionGrpc.ServerReflectionStub): List<String> {
        val request = ServerReflectionRequest.newBuilder()
            .setListServices("")
            .build()

        val services = mutableListOf<String>()
        val latch = CountDownLatch(1)

        reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
            override fun onNext(response: ServerReflectionResponse) {
                if (response.hasListServicesResponse()) {
                    services.addAll(response.listServicesResponse.serviceList.map { it.name })
                }
            }

            override fun onError(t: Throwable) {
                logger.error("Error during listing services: ${t.message}", t)
                latch.countDown()
            }

            override fun onCompleted() {
                latch.countDown()
            }
        }).onNext(request)

        latch.await(2, TimeUnit.SECONDS)
        return services
    }

    // Helper function to get file descriptors for a specific service
    private fun getFileDescriptorsForService(
        reflectionStub: ServerReflectionGrpc.ServerReflectionStub,
        serviceName: String
    ): List<ByteArray> {
        val request = ServerReflectionRequest.newBuilder()
            .setFileContainingSymbol(serviceName)
            .build()

        val descriptors = mutableListOf<ByteArray>()
        val latch = CountDownLatch(1)

        reflectionStub.serverReflectionInfo(object : StreamObserver<ServerReflectionResponse> {
            override fun onNext(response: ServerReflectionResponse) {
                if (response.hasFileDescriptorResponse()) {
                    descriptors.addAll(response.fileDescriptorResponse.fileDescriptorProtoList.map { it.toByteArray() })
                }
            }

            override fun onError(t: Throwable) {
                logger.error("Error during fetching file descriptors: ${t.message}", t)
                latch.countDown()
            }

            override fun onCompleted() {
                latch.countDown()
            }
        }).onNext(request)

        latch.await(1, TimeUnit.SECONDS)
        return descriptors
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
