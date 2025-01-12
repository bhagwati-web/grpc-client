package com.bhagwati.grpcclient

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class GrpcRestClientApplication

fun main(args: Array<String>) {
	runApplication<GrpcRestClientApplication>(*args)
}

// Please create a class and to send hello world message to client as rest endpoint

