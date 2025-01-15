package com.bhagwati.grpcclient

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.boot.CommandLineRunner
import java.awt.Desktop
import java.net.URI

@SpringBootApplication
class GrpcRestClientApplication

@SpringBootApplication
class MySpringBootApplication : CommandLineRunner {

	@Value("\${server.port}")
	private lateinit var serverPort: String

	override fun run(vararg args: String?) {
		openBrowser("http://localhost:$serverPort")
	}

	private fun openBrowser(url: String) {
		if (Desktop.isDesktopSupported()) {
			val desktop = Desktop.getDesktop()
			try {
				desktop.browse(URI(url))
			} catch (e: Exception) {
				e.printStackTrace()
			}
		} else {
			println("Desktop is not supported. Cannot open the browser.\n")
			println("Please visit the following URL manually:\n$url")
		}
	}
}
fun main(args: Array<String>) {
	runApplication<GrpcRestClientApplication>(*args)
}


// Please create a class and to send hello world message to client as rest endpoint

