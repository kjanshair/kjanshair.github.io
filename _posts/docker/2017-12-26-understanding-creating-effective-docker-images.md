---
layout:     post
title:      "Understanding & Creating Effective Docker Images"
date:       2017-12-26
comments: true
author:     "Janshair Khan"
color: "#008EA9"
---

Ever wondered about how to speed up your image building process or building minimal-sized Docker images for your application on a CI server or on your laptop to develop and deploy apps quickly? This post might be helpful for you.

First, to build effective Docker images for your applications, it would be better to first look at the anatomy of a Docker image and how stuffs are organized in a Docker image.

## The Image Technology

It is very likely that you have used an **ISO file** before either by getting it from your friend or downloaded directly from the Internet to install a particular piece of software such as **Ubuntu** or **Windows** on your system. The ISO file is also known as an **Image** file for that piece of software. That image, contains everything you need to install the software and you can install (instantiate) multiple running instances of that software from the same image on a number of computers. 

An image is actually a *snapshot* of a software at a particular time. The image itself does not consume computing resources but when you install the software from that image, the software will consume the computing resources.

The same way you might have used or built images for virtual machines of a public or on-premises cloud such as AMIs in AWS, VHDs in Azure, OVAs in VMware and others. A VM image is also a snapshot of a virtual machine on a particular time period.

If we take the same ISO file analogy and install Ubuntu on a system, for example, against the ISO file then we can say that the system is a running *instance* of the ISO image file which actually consumes computing resources. If we build an EC2 instance from an AMI in AWS, that EC2 instance is a running instance of that AMI which consumes computing resources for what we pay for.

The same way Docker images & containers are related to each other. A container is a running instance of a Docker image which actually consumes computing resources. A Docker image represents a snapshot of an application at particular period of time.

But the question is how Docker images are different from other image technologies such as ISO image files, AMIs, VHDs etc and how do we create effective Docker images for our applications? This is where we need to understand **Docker Image Layered File System**.

## Docker Images & Layers

A Docker image is composed of *layers*. A Docker image is created using a *Dockerfile*. Dockerfile is a file that contains a number of instructions used to build your application image. To help understand an Image's Layered File System, let's take an analogy of a construction building. Say we have a 4 story building of a company's office. Each floor of the building is held by a department of the company.

If we take each floor as **a layer** of the building, we can say that the building has 4 layers built on the top of each other. The bottom most layer is called the *base* layer of the building as shown below. At the top of the base layer, we add additional layer to form a complete building.

<img src="https://kjanshair.azureedge.net/docker/understanding-creating-effective-docker-images/1.png" alt="building-1" class="img-responsive center-block"/>

Suppose we want to make a change in the layer 2 of the building, for this we have to destroy and re-build the 3rd and 4th layers of the building as well for but won't change the bottom most base layer.

Similar concept applies to Docker images. Docker images are composed of layers built on the top of each other. If we modify any layer below the top most layer, all the upper layers would take effect but the layers below that **modified** layer won't change.

<img src="https://kjanshair.azureedge.net/docker/understanding-creating-effective-docker-images/2.png" alt="building-2" class="img-responsive center-block"/>

<img src="https://kjanshair.azureedge.net/docker/understanding-creating-effective-docker-images/3.png" alt="building-3" class="img-responsive center-block"/>

<img src="https://kjanshair.azureedge.net/docker/understanding-creating-effective-docker-images/4.png" alt="building-4" class="img-responsive center-block"/>

Let's take a simple example to see how image layers are created & organized. Consider the below Dockerfile:

```dockerfile
FROM microsoft/dotnet:latest

WORKDIR /app

COPY . /app

RUN ["dotnet", "restore"]

ENTRYPOINT ["/bin/bash"]
```

We can easily determine that what this Dockerfile is all about by simply reading the instructions. The Dockerfile is for a .NET Core application and we can see that this Dockerfile contains 5 instructions, hence it will create 5 image layers. We run the command `docker image build -t <img-name> .` at the root of the project to build the image and notice the output carefully:

```
1:  Sending build context to Docker daemon  70.66kB
2:  Step 1/5 : FROM microsoft/dotnet:latest
3:    ---> 7d4dc5c258eb
4:  Step 2/5 : WORKDIR /app
5:    ---> f155edccaebc
6:  Removing intermediate container b9d453e30500
7:  Step 3/5 : COPY . /app
8:    ---> 5e8829f8e16a
9:  Step 4/5 : RUN dotnet restore
10:  ---> Running in 18c1895b1882
11: Restore completed in 63.42 ms for /app/app.csproj.
12:  ---> 8aa5ee29da9e
13: Removing intermediate container 18c1895b1882
14: Step 5/5 : ENTRYPOINT /bin/bash
15:  ---> Running in f5fcc6b37b77
16:  ---> ce49ab5a2c9c
17: Removing intermediate container f5fcc6b37b77
18: Successfully built ce49ab5a2c9c
19: Successfully tagged kjanshair/app1:latest
```

I added the line numbers for reference. The way docker creates an image is it first creates a container from the base image called **Intermediate Container** (you can see the base image ID at line 3). It then executes the second instruction of the Dockerfile in the intermediate container, creates another image layer (with ID on line 5) and destroy the intermediate container (line 6). The same way it creates another intermediate container from the last image (image with the ID at line 5), execute the 3rd instruction, creates another image layer and destroys the intermediate container and it keep doing the same for all instructions in the Dockerfile until it creates a final image (with ID at line 18) and assign a tag to it (line 19).

These layers are build on the top of each other. You can use the `docker image history <img-name>` command to see all layers of a particular image. The nice thing about these image layers is that each layer is **cached** by the Docker Engine while creating the image. If we, for example, change an instruction at line 3 of the Dockerfile and then re-build the image, the docker engine will only creates the new layers against the change instruction and all the layers above of that changed layer but won't change the layers below that modified layer instead, it will get it from cache (Remember the building analogy).

To check whether image layers are built again by the Docker engine, We need to modify the source code a bit and then re-build the image. Upon modifying the source code, the change will effect at the 3rd instruction of the Dockerfile. But before modifying the code, run the `docker image history <img-name>` command and note down the top 4 layer IDs of the image that is:

```
ce49ab5a2c9c - Layer 5
8aa5ee29da9e - Layer 4
5e8829f8e16a - Layer 3
f155edccaebc - Layer 2
7d4dc5c258eb - Layer 1
```

Let's modify the source code, re-build the image and notice the output.

```
1.  Sending build context to Docker daemon  70.66kB
2.  Step 1/5 : FROM microsoft/dotnet:latest
3.    ---> 7d4dc5c258eb
4.  Step 2/5 : WORKDIR /app
5.    ---> Using cache
6.    ---> f155edccaebc
7.  Step 3/5 : COPY . /app
8.    ---> eb76f1a774b4
9.  Step 4/5 : RUN dotnet restore
10.   ---> Running in 05be553ca0f0
11. Restore completed in 17.94 ms for /app/app.csproj.
12.   ---> c4125def5c1f
13. Removing intermediate container 05be553ca0f0
14. Step 5/5 : ENTRYPOINT /bin/bash
15.   ---> Running in 83d3eb5046c9
16.   ---> 64a97e217018
17. Removing intermediate container 83d3eb5046c9
18. Successfully built 64a97e217018
19. Successfully tagged kjanshair/app1:latest
```

Notice the line **Using cache** at line 5. This is because upon modifying the source code, the change didn't effect at this layer so it remained unchanged and Docker got the cached layer but below that instruction, everything was re-built. Type the `docker image history <img-name>` command again and check the top 5 layer IDs.

```
64a97e217018 - Layer 5
c4125def5c1f - Layer 4
eb76f1a774b4 - Layer 3
f155edccaebc - Layer 2
7d4dc5c258eb - Layer 1
```

Noticed that the bottom most 2 layer IDs remained unchanged but above 3 layers have been changed due to change in the source code.

> It is important to note that the **RUN** statement in the Dockerfile executes command in a new layer.

So now you have an idea that how Docker images, layers and cache works. A basic idea of how images and layers work is important as it will help you to build optimized images for your applications.

## Creating Optimized Docker Images

Have you noticed that there was a problem while creating the image for our application? That is, NuGet packages were restored again in the image merely upon changing the code this should not be the way we have to restore our packages each time we make a change in code which results slower execution time.

As said earlier that changing the source code effects the *COPY* instruction in the Dockerfile. Hence it will make the above layers to change. Another way of writing Dockerfile for the same application could be:

```dockerfile
FROM microsoft/dotnet:latest

WORKDIR /app

COPY app.csproj /app

RUN ["dotnet", "restore"]

COPY . /app

ENTRYPOINT ["/bin/bash"]
```

This adds two more layers in the Docker cache but while building the image, you will see that the NuGet packages don't get restored upon modifying the source code which results faster image building for our application, it will only copy the new source code and set the entrypoint for the container.

So the second approach for dockerizing the application would be faster for development and deployment. This is how it will help you to know which components of your application should be cached in layers and which should not depending upon your particular case.

## Conclusion

Understanding how Docker organizes images and layers is very helpful for creating effective Docker images. The image built using second approach is a bit larger in disk size but faster as compared to the first approach for dockerizing the same application. Again everything depends upon the situation and application's structure that you want to dockerize. The above solution might be changed in your particular case.  

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
         {% include disqus.html %}
    {% endif %}
{% endif %}