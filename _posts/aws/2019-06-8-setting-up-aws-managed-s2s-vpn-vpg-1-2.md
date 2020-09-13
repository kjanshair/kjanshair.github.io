---
layout:     post
title:      "Setting up AWS Managed Site-to-Site VPN: Virtual Private Gateway"
date:       2019-06-8
comments: true
author:     "Janshair Khan"
color: "#F69400"
---

In this first post, we will see how to setup an AWS managed Site-2-Site VPN using **Virtual Private Gateway** and test connectivity from an EC2. We will setup a VPN tunnel through which network traffic flows between the EC2 (or any remote network) and our local computer (on-premises network). Before we start setting up the VPN Connection, Let's see the AWS Site-2-Site VPN components and a lab scenario that we will be using through out the setup.

### AWS Site-to-Site VPN Components

AWS allows access to routers & firewalls *in the form of softwares* in the AWS Management Console since we don't have direct access to AWS Routers and Firewalls. We need to setup a number of VPN's components to establish a VPN Connection which we will be setting up in the VPC section of AWS Management Console. Below are the base components that we must know before setting up a Site-2-Site VPN Connection in AWS: 

#### Virtual Private Gateway

A Virtual Private Gateway is a software appliance *that sits at the edge of a VPC in AWS*. Virtual Private Gateway is the VPN component on the AWS side *or remote side* of the Site-2-Site VPN and establishes\terminates the VPN connections at AWS side.

#### Customer Gateway

A Customer Gateway is a physical or a software appliance that sits at our network's edge (*or on-premises*) side of the VPN connection. Customer Gateway requires for a public IP address of our on-premises network while creating in AWS Management Console.

#### AWS VPN Connection

An AWS VPN Connection is a *connection between a Virtual Private Gateway and a Customer Gateway*. A VPN connection has 2 VPN tunnels: *Primary* and *Secondary* used for primary and backup purposes. A Virtual Private Gateway and the Customer Gateway uses this connection to establish a Site-2-Side VPN connection between the on-prem network and the remote AWS VPC.

### Setting up the Pre-Requisites

We will setup an AWS VPC with one private subnet, one route table attached to that private subnet and a Linux EC2 with no public IP address assigned (default Subnet Settings). We will be SSHing into the EC2 instance using the private IP address via the AWS Site-2-Site VPN tunnel to test the connectivity.

To quickly setup the pre-requisites for this demo, I wrote a Terraform script which you can execute to setup the environment in one go. You will find the script in the repository [URL](https://github.com/kjanshair/aws-vpn-docker)'s **"init"** directory. To execute the script, run:

```bash
terraform init
```

```bash
terraform apply -var-file=input.tfvars -auto-approve
```

> Modify input.tfvars accordingly if you are following along. Also keep in mind that these AWS resources may cost you some cents

Once the script got executed, you will see a VPC is created with a private subnet, a route table and an EC2 with no public IP address in that one subnet. The Terraform script creates one subnet in one Availability Zone for demonstration purpose only.

Once the stuffs are ready, let's start creating the Site-2-Site VPN Connection.

### Setting up a Site-to-Site VPN Connection

We will start by creating a *Virtual Private Gateway*.

#### Creating a Virtual Private Gateway

As said: Virtual Private Gateway is a software appliance that sits at the edge of a VPC in AWS. Go to VPC home page => Virtual Private Gateways:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/1.png" alt="1" class="img-responsive center-block"/>
{% endif %}

Click **Create Virtual Private Gateway**, assign a tag name and choose Amazon Default ASN:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/2.png" alt="2" class="img-responsive center-block"/>
{% endif %}

Attach the Virtual Private Gateway to the VPC that was created by the Terraform script:- 

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/3.png" alt="3" class="img-responsive center-block"/>
{% endif %}

Now our Virtual Private Gateway is ready and attached to the VPC. We are done with the AWS side now. Let's create a Customer Gateway in AWS.

#### Creating a Customer Gateway

Go to VPC home page => Customer Gateways:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

Click on **Create Customer Gateway**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/5.png" alt="5" class="img-responsive center-block"/>
{% endif %}

Provide a useful tag name, choose the **Static Routing** option and put the public IP address of your on-prem network. I'm on my local-machine and my machine is behind a NAT, so I'll put my public IP address here. You can find your public IP address simply by [googling what is my ip](http://bfy.tw/2mP).

We now have both Virtual Private Gateway and Customer Gateway ready. Let's create the VPN connection.

#### Creating a Site-2-Site VPN Connection

Go to VPC home page and click on **Site-2-Site VPN Connections**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/6.png" alt="6" class="img-responsive center-block"/>
{% endif %}

Click **Create VPN Connection** and choose the Virtual Private Gateway and the Customer Gateway that we just created, choose *Static Routing Option* and provide the CIDR IP Prefix of your network. You can find your local-machine IP by running:

```bash
hostname -I
```

My local-machine IP has currently `192.168.8.100` which lies under the CIDR `192.168.0.0/16` that I'll put here:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/7.png" alt="7" class="img-responsive center-block"/>
{% endif %}

Next, we will associate the Virtual Private Gateway with the VPC's subnet where our EC2 resides in VPC's route table:

#### Updating the route table

Go to VPC => Route Tables, select the route table associated with the private subnet:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/10.png" alt="10" class="img-responsive center-block"/>
{% endif %}

Click on **Edit Routes** and select the Virtual Private Gateway we just provisioned in the Target drop-down section.

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/11.png" alt="11" class="img-responsive center-block"/>
{% endif %}

Now the subnet has been associated with the Virtual Private Gateway. Next, we will start configuring the VPN Connection on our local-machine and start testing the connection.

### Configuring the VPN Connection with Strongswan

When the VPN Connection's **State** becomes **Available** in AWS, click on Download Configuration:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/8.png" alt="8" class="img-responsive center-block"/>
{% endif %}

Choose **Vendor** as **Strongswan**, leave the rest as default and click Download:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/9.png" alt="9" class="img-responsive center-block"/>
{% endif %}

We will get a connection configuration file. This file contains the IP Address of the VPN Tunnel and Pre-Shared Keys (With some other information about the VPN Connection) which are required to establish a VPN Connection.

As said to setup or test a Site-to-Site VPN connection between 2 networks, we need access to Network Routers and Firewalls. Since we have setup all the VPN Connection related stuff on AWS side, we need to configure the VPN Connection on our side of the network using the configuration file we just downloaded. Such configurations are usually carried out by Network Administrators when we provide them this configuration file. But, for demo purpose, we will use an awesome software called **Strongswan** locally to establish\test a VPN connection.

We will be configuring the VPN Connection using Strongswan running inside a Docker Container. I have created a `docker-compose.yml` file for you in the aws-vpn-docker [repository](https://github.com/kjanshair/aws-vpn-docker) which has Strongswan preconfigured. The `docker-compose.yml` file is:-

```yaml
version: "2"

services:
  vpn:
    image: mberner/strongswan:v2
    container_name: vpn
    volumes:
     - "./conf/ipsec.conf:/etc/ipsec.conf"
     - "./conf/ipsec.secrets:/etc/ipsec.secrets"
     - "./conf/sysctl.conf:/etc/sysctl.conf"
    network_mode: host
    privileged: true
```

Information about the Tunnel Configuration and Pre-Shared Keys are already in the downloaded configuration file. You simply need to put *related* **Tunnel Configuration Details** and **Pre-Shared Keys** from the  file to the respective files in **conf** directory of the repository and run `docker-compose up -d` to start the container and establish the VPN connection. Once your connection has been established, find your private IP address of the EC2 and run:

```bash
ssh ubuntu@10.0.xx.xxx
```

To SSH into the EC2 via it's private IP address.

### Points to remember

1. AWS Managed Site-2-Site VPN is a paid AWS service. Click [here](https://aws.amazon.com/vpn/pricing/) to know more about AWS VPN pricing.
2. For a free VPN service, you need to setup a free VPN commercial software such as [OpenVPN](https://openvpn.net/) and install\manage it on an EC2 instance. Some OpenVPN based AMIs are available in AWS Market Place which you can use.

In the next post, we will see how do we use **AWS Transit Gateway** to centrally managed VPC and VPN network connections in AWS.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}