package com.bhagwati.grpcclient.api

import com.bhagwati.grpcclient.constants
import com.bhagwati.grpcclient.model.GrpcRequest
import com.fasterxml.jackson.module.kotlin.jsonMapper
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

// Put CORS configuration in the controller

@CrossOrigin(origins = ["*"])
@RestController
@RequestMapping("/grpc")
class GrpcController {

    private val logger = LoggerFactory.getLogger(GrpcController::class.java)

    // default endpoint function
    @GetMapping
    fun defaultEndpoint(): String {
        return "Default endpoint for grpc"
    }

    @PostMapping("/call")
    fun makeGrpcCall(@RequestBody grpcRequest: GrpcRequest, @RequestHeader allHeaders: Map<String, String>): Any {
        val authorizationHeader = allHeaders["authorization"]
        val clientIdHeader = allHeaders["client-id"]
        val messageRequest = jsonMapper().writeValueAsString(grpcRequest.message)

        // Build the grpc-url command
        val command = listOf(
            constants.GRPC_URL,
            "-H", "Authorization: $authorizationHeader",
            "-H", "client-Id:$clientIdHeader",
            "-d", messageRequest,
            grpcRequest.host,
            grpcRequest.method
        )
        val output = StringBuffer()
        val errorOutput = StringBuffer()
        try {
            println("\n\nExecuting grpc-url command: ${command.joinToString(" ")}\n\n")
            val timeout = 10L // Timeout in seconds

            val process = ProcessBuilder(command)
                .start()


            val bufferSize = 8192 * 10 // Define the buffer size explicitly

            val outputReader = Thread {
                BufferedReader(InputStreamReader(process.inputStream), bufferSize).useLines { lines ->
                    lines.forEach { output.append(it).append("\n") }
                }
            }

            val errorReader = Thread {
                process.errorStream.bufferedReader().useLines { lines ->
                    lines.forEach { errorOutput.append(it).append("\n") }
                }
            }

            outputReader.start()
            errorReader.start()

            val finished = process.waitFor(timeout, TimeUnit.SECONDS)
            if (!finished) {
                process.destroy()
                println("Process timed out after $timeout seconds.")
            } else {
                println("Process completed successfully.")
            }

            // Wait for threads and process to finish
            while (process.isAlive) {
                // Check every 100ms
                Thread.sleep(300)
            }

            // Join the threads to ensure both streams are completely read
            outputReader.join()
            errorReader.join()


            // Finally, check the process exit code
            val exitCode = process.waitFor()
            if (exitCode != 0) {
                println("\n\nError: ${output}\n\n")
                return mapOf("error" to output.toString())
            }
        } catch (e: Exception) {
            return mapOf("error" to e.message.toString())
        }

        return try {
            jsonMapper().readTree(output.toString())
        } catch (e: Exception) {
            mapOf("response" to output.toString(), "error" to e.message)
        }
    }

    // Deprecated
    @GetMapping("/reflections/{host}")
    fun fetchReflectionServices(@PathVariable host: String): Any {
        val command = listOf(constants.GRPC_URL, host, "list")
        // get all services first
        val services = fetchReflections(command)

        if (services.size == 1 && services[0].containsKey("error")) {
            return emptyList<String>()
        }

        // get all functions for each service
        val servicesWithFunctions = services.map {
            val serviceName = it["serviceName"]
            val serviceDetails = it["detailName"]
            val functionCommand = listOf(constants.GRPC_URL, host, "list", serviceDetails)
            val functions = fetchReflections(functionCommand)

            if (functions.size == 1 && functions[0].containsKey("error"))
                mapOf(
                    "serviceName" to serviceName,
                    "serviceDetails" to serviceDetails,
                    "functions" to emptyList<String>()
                )
            else
                mapOf("serviceName" to serviceName, "serviceDetails" to serviceDetails, "functions" to functions)
        }
        return servicesWithFunctions
    }

    // Deprecated
    fun fetchReflections(command: List<String?>): List<Map<String, String>> {
        val output = StringBuffer()
        try {
            println("Executing grpc-url command: ${command.joinToString(" ")}")
            val process = ProcessBuilder(command)
                .redirectErrorStream(true)
                .start()
            process.waitFor()
            BufferedReader(InputStreamReader(process.inputStream)).use {
                var line: String? = it.readLine()
                while (line != null) {
                    if (line.isNotBlank()) {
                        if (output.isEmpty()) {
                            output.append(line) // Append without a comma for the first element
                        } else {
                            output.append(", $line") // Add a comma for subsequent elements
                        }
                    }
                    line = it.readLine()
                }
            }
            val exitCode = process.waitFor()
            if (exitCode != 0) {
                println("\n\nError: ${output}\n\n")
                return listOf(mapOf("error" to output.toString()))
            }
        } catch (e: Exception) {
            return listOf(mapOf("error" to e.message.toString()))
        }

        val outputArray = output.toString().split(",")
        val outputArrayMap = outputArray.map {
            val serviceName = it.split(".").last()
            val detailName = it

            // check if the command is containing the service and set the name based on that
            if (command.size > 3 && command[3] != "")
                mapOf("functionName" to serviceName, "detailName" to detailName.trim())
            else
                mapOf("serviceName" to serviceName, "detailName" to detailName.trim())
        }
        return outputArrayMap
    }
}