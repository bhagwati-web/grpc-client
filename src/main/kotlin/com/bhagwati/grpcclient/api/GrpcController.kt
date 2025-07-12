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
        val command = buildGrpcUrlCommand(
            grpcRequest,
            allHeaders
        )

        val output = StringBuffer()
        val errorOutput = StringBuffer()
        try {
            println("\nStarted gRPC Execution\n")
            println(command.joinToString(" "))
            val timeout = 10L // Timeout in seconds

            // Create ProcessBuilder with proper environment setup
            val processBuilder = ProcessBuilder(command)

            // Get current environment and add homebrew paths
            val environment = processBuilder.environment()
            val currentPath = environment["PATH"] ?: ""
            val homebrewPaths = "/opt/homebrew/bin:/usr/local/bin"

            // Ensure homebrew paths are in the PATH
            if (!currentPath.contains("/opt/homebrew/bin")) {
                environment["PATH"] = "$homebrewPaths:$currentPath"
            }

            println("Using PATH: ${environment["PATH"]}")

            val process = processBuilder.start()
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
                println("\nProcess timed out after $timeout seconds.")
            } else {
                println("\nProcess completed successfully.")
            }

            // Wait for threads and process to finish
            while (process.isAlive) {
                // Check every 300ms
                Thread.sleep(300)
            }

            // Join the threads to ensure both streams are completely read
            outputReader.join()
            errorReader.join()


            // Finally, check the process exit code
            val exitCode = process.waitFor()
            if (exitCode != 0) {
                println("\n\nError: There is a an error executing the request\n${errorOutput}\n\n")
                return mapOf("error" to errorOutput)
            }
        } catch (e: Exception) {
            println("\n\nError: ${e.message}\n\n")
            return mapOf("error" to e.message.toString())
        }

        return try {
            jsonMapper().readTree(output.toString())
        } catch (e: Exception) {
            mapOf("response" to output.toString(), "error" to e.message)
        }
    }

    fun buildGrpcUrlCommand(grpcRequest: GrpcRequest, allHeaders: Map<String, String>): List<String> {
        if (grpcRequest.host == "" || grpcRequest.method == "" || grpcRequest.message == "") {
            return emptyList()
        }

        val messageRequest = jsonMapper().writeValueAsString(grpcRequest.message)
        val host = grpcRequest.host
        val method = grpcRequest.method
        val authHeader = allHeaders["authorization"]

        // Start building the grp-curl command
        val command = mutableListOf<String>()

        // Add common headers
        command.add(constants.GRPC_URL)  // The grp-curl command

        // Conditionally add -plaintext for insecure connections
        if (!host.contains("443") && !host.contains("https")) {
            command.add("-plaintext")
        }

        val authHeaderFromMeta = grpcRequest.metaData?.firstNotNullOfOrNull { it["authorization"] }

        grpcRequest.metaData?.forEach {
            it.forEach { (key, value) ->
                command.add("-H")
                command.add("$key:$value")
            }
        }

        // check if the authorization header is present in meta data else find it from headers and put it in the command
        if (authHeaderFromMeta == null && authHeader != null) {
            command.add("-H")
            command.add("authorization:$authHeader")
        }

        command.add("-d")
        command.add(messageRequest)
        command.add(host)
        command.add(method)

        return command
    }

}