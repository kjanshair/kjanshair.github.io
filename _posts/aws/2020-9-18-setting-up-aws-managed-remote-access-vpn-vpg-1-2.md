---
layout:     post
title:      "Setting up an AWS Managed Remote Access VPN: Virtual Private Gateway"
date:       2020-9-18
comments: true
author:     "Janshair Khan"
color: "#F69400"
---

In this first post, we will see how to set up an AWS managed Remote Access VPN using **Virtual Private Gateway** and test connectivity with an EC2. We will set up a VPN tunnel through which network traffic flows between the EC2 (remote network) and our local computer (on-premises network) with a *Client VPN software installed*. Before we start setting up the VPN connection, Let's see what AWS VPN components are required and what are they to set up a VPN connection and a lab scenario that we will be using throughout the set up. 

### AWS VPN Components

AWS allows access to routers and firewalls *in the form of software* through the AWS Management Console and AWS SDKs as we cannot have direct access to AWS routers and firewalls. We need to set up a few AWS resources, such as a VPC and an EC2 instance, to which we will be setting up the VPN connection. Below are the basic VPN components that we must know about before setting up a VPN connection in AWS: 

#### Virtual Private Gateway

A Virtual Private Gateway is a software appliance *that sits at the edge of a VPC in AWS*. Virtual Private Gateway is the VPN component on the AWS side *or remote side* of the VPN connection and establishes\terminates the VPN connections at AWS side.

#### Customer Gateway

A Customer Gateway, in AWS, is a software appliance that represents our network (*on-premises network*) to the AWS, and that VPN connection will consider as destination when set up. The Customer Gateway requires a public IP address of our network while setting it up.

#### AWS VPN Connection

An AWS VPN connection is a *connection between a Virtual Private Gateway and a Customer Gateway*. A VPN connection has two VPN tunnels: *Primary* and *Secondary* used for primary and backup purposes. A Virtual Private Gateway and the Customer Gateway use this connection to establish a Remote Access or Site-to-Side VPN connection between the on-prem network and the AWS VPC.

### Setting up the environment

We will be setting up an AWS VPC with one private subnet, one route table attached to that private subnet, and a Linux EC2 with no public IP address assigned (default subnet settings) inside that private subnet. Finally, we will be SSHing into the EC2 instance using the private IP address via the AWS Remote Access VPN tunnel to test the connectivity.

To quickly set up the environment for this demo, I wrote a Terraform script which you can execute to set up the environment in one go. You will find the script in the repository [URL](https://github.com/kjanshair/aws-vpn-docker)s **"init"** directory.

To execute the script, run:

```bash
terraform init
```

```bash
terraform apply -var-file=input.tfvars -auto-approve
```

> Modify `input.tfvars` accordingly if you are following along. Also, keep in mind that all the AWS resources we will be provisioning may cost you some cents. Make sure you delete them if they are no longer required.

Once the script gets executed, you will see a VPC is created with a private subnet, a route table and an EC2 with no public IP address. The script creates the only subnet in one Availability Zone for demonstration purpose.

Once ready, let's start creating the VPN connection.

### Setting up the VPN Connection

We will start by creating a *Virtual Private Gateway*.

#### Creating a Virtual Private Gateway

As previously mentioned: Virtual Private Gateway is a software appliance that sits at the edge of the VPC in AWS. Go to the VPC home page => Virtual Private Gateways:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/1.png" alt="1" class="img-responsive center-block"/>
{% endif %}

Click **Create Virtual Private Gateway**, assign a tag name to it and choose Amazon Default ASN:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/2.png" alt="2" class="img-responsive center-block"/>
{% endif %}

Attach the Virtual Private Gateway to the VPC that was created by the Terraform script:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/3.png" alt="3" class="img-responsive center-block"/>
{% endif %}

Now our Virtual Private Gateway is ready and attached to the VPC. We are done with the AWS side. Let's create a Customer Gateway in AWS.

#### Creating a Customer Gateway

Go to VPC home page => Customer Gateways:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

Click on **Create Customer Gateway**:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/5.png" alt="5" class="img-responsive center-block"/>
{% endif %}

Provide a useful tag name, choose the **Static Routing** option and enter the public IP address of your on-prem network there. I'm on my local machine and my machine is behind a NAT, so I'll enter my public IP address here. You can find your public IP address simply by [googling what is my ip](http://bfy.tw/2mP).

We now have both a Virtual Private Gateway and a Customer Gateway ready. Let's create the VPN connection.

#### Creating a Remote Access VPN Connection

Go to VPC home page and click on **Remote Access VPN Connections**:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/6.png" alt="6" class="img-responsive center-block"/>
{% endif %}

Click **Create VPN Connection** and choose the Virtual Private Gateway and the Customer Gateway that we just created, choose *Static Routing Option* and provide the CIDR IP range of your network where your computer resides. You can find your local-machine IP by running:

```bash
hostname -I
```

My local-machine IP has currently `192.168.8.100`, which lies under the CIDR `192.168.0.0/16` that I'll put here:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/7.png" alt="7" class="img-responsive center-block"/>
{% endif %}

Next, we will associate the Virtual Private Gateway with the VPC private subnet where our EC2 resides in the VPC route table.

#### Updating the route table

Go to VPC => Route Tables, select the route table associated with the private subnet:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/10.png" alt="10" class="img-responsive center-block"/>
{% endif %}

Click on **Edit Routes** and select the Virtual Private Gateway we just provisioned in the **Target** drop-down section.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/11.png" alt="11" class="img-responsive center-block"/>
{% endif %}

Now the subnet has been associated with the Virtual Private Gateway. Next, we will start configuring the VPN connection on our local-machine and test.

### Configuring the VPN Connection with Strongswan

When the VPN connection's **State** becomes **Available** in AWS, click on Download Configuration:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/8.png" alt="8" class="img-responsive center-block"/>
{% endif %}

Choose **Vendor** as **Strongswan**, leave the rest as default and click Download:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/9.png" alt="9" class="img-responsive center-block"/>
{% endif %}

We will get a connection configuration file. This file contains the IP Address of the VPN Tunnel and Pre-Shared Keys (With some other information about the VPN connection) which are required to establish a VPN connection.

As said to set up or test a VPN connection between 2 networks, we need access to network routers and firewalls. Since we have set up all the VPN connection related stuff on AWS side, we need to configure the VPN connection on our side of the network using the configuration file we just downloaded. Such configurations are usually carried out by Network Administrators when we provide them this configuration file. But, for demo purpose, we will use an awesome VPC client software called **Strongswan** on our computer to test the connection.

We will be configuring the VPN connection using Strongswan running inside a Docker container. I have created a `docker-compose.yml` file for you in the `aws-vpn-docker` [repository](https://github.com/kjanshair/aws-vpn-docker) which has Strongswan preconfigured. The `docker-compose.yml` file is:-

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

Information about the Tunnel Configuration and Pre-Shared Keys are already present in the downloaded configuration file. You simply need to put *related* **Tunnel Configuration Details** and **Pre-Shared Keys** from the file to the respective files in **conf** directory of the repository and run `docker-compose up -d` to start the container and establish the VPN connection. Once your connection is ready, find your private IP address of the EC2 and SSH with:

```bash
ssh ubuntu@10.0.xx.xxx
```

To SSH into the EC2 via it's private IP address. That's all. We have successfully tested our connection.

### Points to remember

1. AWS Managed Remote Access VPN is a paid AWS service. Click [here](https://aws.amazon.com/vpn/pricing/) to know more about AWS VPN pricing.
2. The same methodology works for Site-2-Site, Remote Access VPNs.
3. For a free VPN service, you need to set up a free VPN commercial software such as [OpenVPN](https://openvpn.net/) and install/manage it on an EC2 instance. Some OpenVPN based AMIs are available in AWS Market Place which you can use.

In the next post, we will see how do we use **AWS Transit Gateway** to centrally managed VPC and VPN network connections in AWS.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}