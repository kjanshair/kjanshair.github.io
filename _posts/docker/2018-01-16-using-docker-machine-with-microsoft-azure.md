---
layout:     post
title:      "Using docker-machine with Microsoft Azure"
date:       2018-01-16
comments: true
author:     "Janshair Khan"
color: "#006EBF"
---

# Up and running with Azure driver for docker-machine

## What is Docker Machine?

According to the <a href="https://docs.docker.com/machine/overview/" class="underline">documentation</a>:

"Docker Machine is a tool that lets you install Docker Engine on virtual hosts, and manage the hosts with docker-machine commands. You can use Machine to create Docker hosts on your local Mac or Windows box, on your company network, in your data center, or on cloud providers like Azure, AWS, or Digital Ocean."

Docker Machine automates the flow of provisioning a VM with an Operating System, installing Docker engine and required dependencies on a cloud provider or on on-premises system(s). It is also helpful to setup a quick cluster of Docker engines and setting up a Swarm.

## Using Docker Machine with Microsoft Azure

Now let's see Docker Machine in action with Microsoft Azure driver. We will provision a new Azure Linux Ubuntu 16.04 LTS VM with Docker pre-installed via `docker-machine` CLI.

## Installing Docker Machine

Docker machine comes along with Docker for Windows, Docker for Mac and legacy Docker Toolbox. For Linux users, refer to <a href="https://docs.docker.com/machine/install-machine/" class="underline" target="_blank">this</a> article to learn how to install Docker Machine for your particular Linux distribution.

## Creating Azure VM with docker-machine

Open up your terminal and look for `docker-machine` command to make sure that Docker Machine is up and running on your system. Run the `docker-machine ls` to list existing Docker Machines pre-configured on your system.

To create a Docker Machine in the cloud, we use a Docker Machine driver for a particular cloud provider or hyper-visor (such as Oracle VBox) to provision the virtual machine and install latest version of docker. We will use `docker-machine create` command with the following Syntax:


```bash
docker-machine create --driver [provider] --azure-subscription-id [id] --azure-subnet-prefix [azure-vnet-subnet] --azure-open-port [port] --azure-private-ip-address [private-ip-address] --azure-location [azure-region] [machine-name]
```

Although there are <a href="https://docs.docker.com/machine/drivers/azure/" class="underline">other</a> options\flags available to further customize your deployments such as changing the VM image etc. To keep things simple, we'll use the command:

```bash
docker-machine create --driver azure --azure-open-port 80 --azure-subscription-id axxxxx-xxxx-xxxx-xxxx-xxxxx --azure-subnet-prefix 10.0.0.0/24 --azure-private-ip-address 10.0.0.5 --azure-location "Southeast Asia" machine
```

This will setup an Azure Virtual Machine:

- In Azure SouthEast Asia Region with the VM name `machine`
- In a Azure VNet with a Public-IP `master-ip` address prefix
- In a private Subnet `10.0.0.0/24` and with a private IP address `10.0.0.5`
- Install latest version of Docker and allow Internet traffic from port 80 via an NSG
- With a Ubuntu 16.04 LTS VM Image (default)

After a short time, it will successfully provision the VM with its components and now run `docker-machine ls` on your machine with Microsoft Azure driver and you'll see Docker Machine is ready.

{% if jekyll.environment == "production" %}
 <img src="{{ site.cdnurl }}/docker/docker-machine-azure-driver/docker-machine-azure-1.png" alt="docker-machine-azure-1" class="img-responsive center-block"/>
{% endif %}

## Configuring Docker Client to connect to the docker-machine

The final step needed here is to configure your `docker` CLI to point the Docker Machine running in Azure. To do this, run `docker-machine env machine` command to see the required configuration details.

{% if jekyll.environment == "production" %}
  <img src="{{ site.cdnurl }}/docker/docker-machine-azure-driver/docker-machine-azure-2.png" alt="docker-machine-azure-1" class="img-responsive center-block"/>
{% endif %}

> Note the `DOCKER_HOST` environment variable. It displays the Public IP address of the VM that we just provisioned.

After setting Docker client, every Docker command that you run on your location terminal will be executed on the remote Azure VM. So pull a sample image by running:

```bash
docker pull kjanshair/aspnetcore-example
```

Run the container:

```bash
docker run -d --name app -p 80:80 kjanshair/aspnetcore-example
```

And browse to the Public IP address of the VM in a browser and you will see that the application is up and running.

{% if jekyll.environment == "production" %}
  <img src="{{ site.cdnurl }}/docker/docker-machine-azure-driver/docker-machine-azure-3.png" alt="docker-machine-azure-1" class="img-responsive center-block"/>
{% endif %}


{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}