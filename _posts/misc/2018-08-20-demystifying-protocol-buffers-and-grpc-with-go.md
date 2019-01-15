---
layout:     post
title:      "Demystifying Protocol Buffers and gRPC with Go"
date:       2018-08-20
comments: true
author:     "Janshair Khan"
color: "#6AD7E5"
---

## Problems with REST

Applications or Client\Server inter-communications and the ways to improve them is an important part in today's software development life-cycle especially in a **Microservice Architecture**. Developers have been using REST as a primary way for application inter-communication for decades as it has a large number programming language support. In REST, communication between a client and a server happens over HTTP protocol and the data is exchanged either in JSON or XML format between a client and the server.

With continuous gaining momentum of Microservice Architecture and increasing demand for building cloud-native apps, REST loses some points. Upon looking carefully, we see that the data exchange format for REST are either in JSON or XML format which is simply **text formats**. With this text format, the client and the server both have to parse these text based data in order to communicate with each other. Moreover, if the data in a JSON or XML document grows, the more the client and the server has to spend computation for parsing and processing the data.

In Practical, we use REST by building **Models**. Let's say we have a REST server which provides some web-services, we have a method called `Greet()` on the server which expects 1 parameter of type string `name` (i.e. `Greet(name string)`). Now we want to expose this method as a service to REST clients.
In order to make this method consumable from a REST client, the server has to create a *Model* containing the `name` attribute (And may be other attributes depending upon the REST-client library) where the server should serialize or de-serialize JSON or XML document against that Model. Client on the other hand has to:

- Put the required arguments for the method and putting it in JSON or XML
- Serialize a JSON or XML document matching the model on the server
- Send the document to the server
- Get response from server in the form of serialized document
- De-serialize the JSON or XML document, extract the response and proceed


In the above procedure, we feel that this is a lengthy process as the client and the server has to spend most of its time serializing and de-serializing data from or to a JSON\XML document and the problem grows when we have more data in the document to be sent over the wire. With that, another player comes into the play: **gRPC**.

## What is gRPC?

gRPC is a **RPC Framework** from Google where RPC stands for *Remote Procedure Call*. In gRPC, we define our services that we want clients to consume in the form of our native programming language (Using Methods etc) the same way we do with REST and let the client to call these methods remotely via a *Contract*. Clients can also pass parameters or other data to these services to get more appropriate data from the server. But how it is different from REST?

gRPC uses **Protocol Buffers** (*Protobuf* for short) to describe the data. Protobuf serializes data in binary instead of raw text-based JSON or XML format. Since computers love binaries more than human-readable texts, this vastly improves the overall serialization and de-serialization process and hence improves the overall application inter-communications. In gRPC terminology, we call the server which exposes the web services as **gRPC Server**, the consumer as **gRPC Client**. 

### Getting Started

In this post, we will see that how do we setup a gRPC and Protocol Buffers based client-server architecture with Go in action. I'll try my best to keep things as simple as possible to make it easy to understand for newbies. We will start from creating a gRPC Server in Go which exposes a `SayHello()` method. This method will display a welcome message as the response to all clients who call this method remotely.

### Setting up Go Workspace

First we need a Go workspace for both gRPC client and gRPC server. To do this, create a directory by the name `grpc-golang` with 3 sub-folders namely `pkg`, `bin` and `src`, and set your **`$GOPATH`** environment variable to this `grpc-golang` directory.

> Make sure that Go and Protocol Buffer compiler are installed on your system. Follow <a href="https://golang.org/dl/" class="underline" target="_blank">this</a> to install Go and this <a href="https://developers.google.com/protocol-buffers/docs/downloads" class="underline" target="_blank">this</a> on your system if you haven't installed Go and Protocol Buffer compiler.

Now we have our Go workspace. We now need to run below commands to get required Go packages to get up and running with a gRPC Server and a gRPC client. These commands will also install `protoc-gen-go` which is a compiler for Protocol Buffer:

`go get -u github.com/golang/protobuf/protoc-gen-go`

`go get -u golang.org/x/net/context`

`go get -u google.golang.org/grpc`

`go get -u google.golang.org/grpc/reflection`

Now we have our packages ready. Next we need to create a Protocol Buffer definition file which contains the contents about what services a gRPC server provides. 

This Protocol Buffer definition file acts as a *Contract* between a gRPC Server and gRPC Clients. We define fields and methods in this definition file which a gRPC server is going to implement in the code. The definition file also contains fields and methods that a gRPC client can use to interact with gRPC server. This makes it clear for gRPC server that what it should do in order to provide services and what services are available for gRPC client. This file has an **.proto** extension. Create a file at the directory `${GOPATH}/src/api` by the name `api.proto` and add the following content in the file:

```
syntax="proto3";
package api;

message Request {
	string RequestApi = 1;
}

message Response {
	string ResponseApi = 1;
}

service Greeting {
	rpc SayHello(Request) returns (Response) {};
}

```

The file is pretty self-explanatory. It has 2 fields a `Request`, a `Response` and one `Greeting` service. The `Greeting` service contains a *method* `SayHello()` which takes the `Request` object and returns the `Response` object. Now this file is useless without the `protoc` compiler. We will use `protoc` compiler to generate a Go native implementation package for the above defined `api.proto` file. We will then import this generated Go package in our code where we will write code for gRPC Server (gRPC Server Stub). This generated file will act as a contract between gRPC server and gRPC client in our native programming language. So Run the below command to generate Go code based upon the above defined proto file definition:

`protoc -I=${GOPATH}/src --go_out=plugins=grpc:${GOPATH}/src ${GOPATH}/src/api/api.proto`

> This syntax of proto definition file is out of scope of this blog post. You can read <a href="https://developers.google.com/protocol-buffers/docs/proto" class="underline" target="_blank">here</a> to learn more about how to write proto files for your own use case.

Note the `--go_out=plugins=grpc` part of the command. This command will generate a Go code at the same location where our proto definition file is. Next we need to write code for setting up a **gRPC Server** in Go which will serve for requests. We will treat the code for gRPC Server and the generated proto Go code as 2 separate Go packages where the proto generated code will be imported as package inside the gRPC server Go package. Lets write code for gRPC Server. Create a file at `src/server/main.go` and add the below code:

```
package main

import (
	"api"
	"context"
	"fmt"
	"net"

	"google.golang.org/grpc/reflection"

	"google.golang.org/grpc"
)

type Server struct{}

func (s *Server) SayHello(ctx context.Context, in *api.Request) (*api.Response, error) {
	return &api.Response{ResponseApi: "Welcome to gRPC " + in.RequestApi}, nil
}

func main() {
	lis, _ := net.Listen("tcp", ":8080")

	c := grpc.NewServer()

	api.RegisterGreetingServer(c, &Server{})

	reflection.Register(c)

	fmt.Println("Server started at port :8080")
	c.Serve(lis)
}
```
Lets see what is defined in this file: First, we have some imports in gRPC Server package. We imported proto generated **api** package with other gRPC libs that we downloaded earlier to create minimalist gRPC server. We then have a method defined in this code `SayHello()`. This is the same method name we defined in our proto definition file. Here, we simply overrides the method defined in the proto generated file. This method takes a parameter and simply respond with a welcome text to the incoming parameter (Request in this case) from a gRPC client as we will see in a bit. We are also passing the `ctx` object here as parameters which is very powerful to work with current gRPC request\response contexts.

Now our gRPC Server is ready. Next we need a gRPC client to consume those services exposed by gRPC Server.

Create a file at `${GOPATH}/src/client/main.go` and put the below code in the file:

```
package main

import (
	"api"
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
)

func main() {
	conn, _ := grpc.Dial("localhost:8080", grpc.WithInsecure())
	defer conn.Close()

	client := api.NewGreetingClient(conn)

	ctx, _ := context.WithTimeout(context.Background(), time.Second)

	r, _ := client.SayHello(ctx, &api.Request{RequestApi: "Janshair"})

	fmt.Println(r.ResponseApi)
}


```

In this file, gRPC client looks for gRPC Server and connect, initiate a new gRPC client and simply call the `SayHello()` method with a custom parameter of `RequestApi: "Janshair"`. Save this file and now we have our gRPC client. Finally, we need to run both client and server side-by-side to see them in action. Simply run `go run src/server/main.go` in one session of the terminal. This will start the gRPC server with displaying a message saying that gRPC is ready to serve. To check client's connectivity, run `go run src/client/main.go` in another session of the terminal. This client will call `SayHello()` method defined in the gRPC server by passing `ResponseApi` as parameter to `SayHello()` method which would print a welcome message to the person name passed as parameter to the `SayHello()` method.

## Further Considerations

The above defined was a simplest gRPC client\server architecture implementation. You can write gRPC client or gRPC server in any programming language or create server in one and client in another language and vice versa. gRPC doesn't require you to write another library to make communication successful. The source code for the example can be found at the GitHub <a href="https://github.com/kjanshair/grpc-go-example" class="underline" target="_blank">repository</a>. You can learn more about gRPC at the official <a href="https://grpc.io/docs/" class="underline" target="_blank">documentation</a>.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}