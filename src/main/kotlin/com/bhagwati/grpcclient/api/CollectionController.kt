package com.bhagwati.grpcclient.api

import com.bhagwati.grpcclient.constants
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jsonMapper
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.*
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

@CrossOrigin(origins = ["*"])
@RestController
@RequestMapping("/collection")
class CollectionController() {

    private val logger = LoggerFactory.getLogger(this::class.java)

    private val baseFolderPath = Paths.get(System.getProperty("user.home"), constants.GRPC_COLLECTION_LOCATION)
    private val sampleFolderPath: String =
        constants.GRPC_COLLECTION_LOCATION_SAMPLE // This will be the folder path for classpath resources

    init {
        // Ensure that the base folder exists
        Files.createDirectories(baseFolderPath)
    }

    @GetMapping("/load")
    fun loadCollection(): List<Map<String, *>> {

        // Load user collections from the filesystem
        //val userCollection = getAllCollectionFromFolder(baseFolderPath)

        // Load sample collections from the classpath
        val sampleCollection = getAllCollectionFromClasspath()

        // Return combined collections
        return sampleCollection
        //return sampleCollection
    }

    fun getAllCollectionFromFolder(folderPath: Path): List<Map<String, *>> {
        val collections = mutableListOf<Map<String, *>>()
        try {
            Files.walk(folderPath)
                .filter { Files.isRegularFile(it) && it.toString().endsWith(constants.GRPC_COLLECTION_FILE_EXTENSION) }
                .forEach { filePath ->
                    val collectionContent = File(filePath.toUri()).readText()
                    val serviceName = filePath.parent.fileName.toString()
                    val requestName =
                        filePath.fileName.toString().removeSuffix(constants.GRPC_COLLECTION_FILE_EXTENSION)
                    val collectionData =
                        jsonMapper().readValue(collectionContent, object : TypeReference<Map<String, *>>() {})

                    addToCollections(collections, serviceName, requestName, collectionData)
                }
        } catch (e: Exception) {
            println("Error loading collections: ${e.message}")
        }
        return collections
    }

    fun getAllCollectionFromClasspath(): List<Map<String, *>> {
        val collections = mutableListOf<Map<String, *>>()

        // Please uncomment the following line when doing local development
//         val resources = this::class.java.classLoader.getResources("static/sample-data/").toList()

        // And comment following line if you want to run it from jar file
        val resources = this::class.java.classLoader.getResources("sample-data").toList()

        resources.forEach { resource ->
            logger.info("Loading sample gRPC collections")
            println(resource.toURI())
            try {
                val directory = File(resource.toURI())
                processResourceDirectory(directory, collections)
                logger.info("Loaded sample gRPC collections ${resource.toURI()}")
            }
            catch (e:Exception){
                logger.error("Error Loading sample gRPC collections")
            }
        }
        return collections
    }

    fun processResourceDirectory(directory: File, collections: MutableList<Map<String, *>>) {
        directory.listFiles()?.forEach { file ->
            if (file.isDirectory) {
                processResourceDirectory(file, collections)
            } else if (file.name.endsWith(constants.GRPC_COLLECTION_FILE_EXTENSION)) {
                val serviceName = directory.name
                val requestName = file.name.removeSuffix(constants.GRPC_COLLECTION_FILE_EXTENSION)
                val content = file.readText()
                val collectionData = jsonMapper().readValue(content, object : TypeReference<Map<String, *>>() {})

                addToCollections(collections, serviceName, requestName, collectionData)
            }
        }
    }

    fun addToCollections(
        collections: MutableList<Map<String, *>>,
        serviceName: String,
        requestName: String,
        collectionData: Map<String, *>
    ) {
        val serviceEntry = collections.find { it["title"] == serviceName }
            ?: mutableMapOf(
                "title" to serviceName,
                "items" to mutableListOf<Map<String, *>>()
            ).also {
                collections.add(it)
            }

        val items = (serviceEntry["items"] as MutableList<Map<String, *>>)
        items.add(
            mapOf(
                "message" to collectionData["message"],
                "metaData" to collectionData["metaData"],
                "host" to collectionData["host"],
                "service" to collectionData["service"],
                "serviceName" to serviceName,
                "requestName" to requestName
            )
        )
    }

    @PostMapping("/save")
    fun saveCollection(@RequestBody collection: Map<String, Any>): Map<String, String> {

        val host = collection["host"] as String
        val method = collection["method"] as String
        val collectionName = host.substring(0, host.indexOf("."))
        val requestName = method.substring(method.lastIndexOf(".") + 1)

        // Save the collection
        if (collectionName.isEmpty() || requestName.isEmpty()) {
            return mapOf("message" to "Invalid collection", "status" to constants.GgrcResponseStatus.ERROR)
        }

        var isNewFile = true

        val subfolderPath = baseFolderPath.resolve(collectionName)
        Files.createDirectories(subfolderPath)

        val fileName = "$requestName.json"
        val filePath = subfolderPath.resolve(fileName)

        val fileContent = jsonMapper().writeValueAsString(collection)

        // Check if file already exists
        if (Files.exists(filePath)) {
            isNewFile = false
        }

        try {
            File(filePath.toUri()).writeText(fileContent)
        } catch (e: Exception) {
            return mapOf("message" to "Error saving collection", "status" to constants.GgrcResponseStatus.ERROR)
        }

        return if (isNewFile) {
            mapOf("message" to "Collection saved successfully", "status" to constants.GgrcResponseStatus.SUCCESS)
        } else {
            mapOf("message" to "Collection updated successfully", "status" to constants.GgrcResponseStatus.SUCCESS)
        }
    }

    @DeleteMapping("/delete")
    fun deleteCollection(@RequestBody collection: Map<String, String>): Map<String, String> {
        val collectionName = collection["serviceName"]
        val method = collection["method"]
        val requestName = method?.substring(method.lastIndexOf(".") + 1)

        if (collectionName == null || requestName == null) {
            return mapOf("message" to "Invalid collection", "status" to constants.GgrcResponseStatus.ERROR)
        }

        val subfolderPath =
            baseFolderPath.resolve(collectionName).resolve("$requestName${constants.GRPC_COLLECTION_FILE_EXTENSION}")
        val file = File(subfolderPath.toUri())

        return if (file.exists()) {
            file.delete()
            mapOf("message" to "Collection deleted successfully", "status" to constants.GgrcResponseStatus.SUCCESS)
        } else {
            // Check if the collection is a sample data
            val isSampleData = isSampleCollection(collectionName, requestName)
            if (isSampleData) {
                return mapOf(
                    "message" to "Sample data cannot be deleted",
                    "status" to constants.GgrcResponseStatus.ERROR
                )
            }

            mapOf("message" to "Collection not found", "status" to constants.GgrcResponseStatus.ERROR)
        }
    }

    fun isSampleCollection(collectionName: String, requestName: String): Boolean {
        val sampleCollections = getAllCollectionFromClasspath() // Load sample data from classpath
        return sampleCollections.any { collection ->
            val collectionTitle = collection["title"]
            val items = collection["items"] as? List<Map<String, *>>
            collectionTitle == collectionName && items?.any { item ->
                item["requestName"] == requestName
            } == true
        }
    }
}