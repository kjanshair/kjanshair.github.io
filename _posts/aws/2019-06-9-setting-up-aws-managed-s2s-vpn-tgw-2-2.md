---
layout:     post
title:      "Setting up AWS Managed Site-to-Site VPN: Transit Gateway"
date:       2019-06-9
comments: true
author:     "Janshair Khan"
color: "#F69400"
---

In the last post, we saw how to setup a Site-to-Site VPN Connection between on-premises and AWS VPC networks. In this post, we will setup the Site-to-Site VPN Connection but with a more robust and advanced approach that is by using **AWS Transit Gateway**. If you haven't gone through the last post and directly want to use AWS Transit Gateway with Site-to-Site VPN, you can follow along and continue.

#### The Problem!
Previously, we used to configure connection between networks either on-premises networks or AWS VPC networks using Virtual Private Gateways or VPC Peering Connections respectively in AWS. As the number of applications or services grow, managing these VPGs & Peering Connections becomes a difficult task and we end up with scattered information having a **Mesh** of networks of different applications and services. For example, Managing a mesh of 5 networks in AWS, we had to manage 10 VPC Peering Connections which becomes even more difficult to handle when we have even more application stack to deal with.

#### AWS Transit Gateway
AWS Transit Gateway (TGW) mitigates the above mentioned problem by allowing us to **centrally manage** the on-premises and VPC network connections and routing to prevent forming a mesh using *attachments* and *routes*. AWS Transit Gateway is fully managed and scalable network solution from AWS.

> You can find more details about AWS TGW in the [FAQs](https://aws.amazon.com/transit-gateway/faqs/) section of the AWS Documentation.

### Setting up the Pre-Requisite Environment
We have an environment having a VPC in `us-east-1` region with a subnet, a route table attached to the subnet and a Linux EC2 instance without any associated public IP address in the subnet. We will be connecting to the EC2 instance using the private IP address through the encrypted AWS Site-to-Site VPN tunnel.

To setup the environment on your AWS account, you can find a Terraform script that I have created in the repository [URL](https://github.com/kjanshair/aws-vpn-docker) under the **"init"** directory to prepare the entire environment in on go. To execute the script, run:

```bash
terraform init
```

```bash
terraform apply -var-file=input.tfvars -auto-approve
```

> Modify input.tfvars accordingly if you are following along.

Once the script is executed successfully, you will see a VPC is created with a subnet, a route table and an EC2 with no public IP attached to the instance. The script creates one subnet in one Availability Zone for demonstration purpose only.

Once the environment is ready, let's start creating a Site-to-Site VPN Connection with AWS Transit Gateway.

### Setting up a Site-to-Site VPN Connection using AWS Transit Gateway

This time, we will setup the VPN Connection using AWS Transit Gateway (TGW). When creating VPN Connection with AWS TGW, we don't have to explicitly provision a Virtual Private Gateway and a Site-to-Site VPN Connection in AWS Management Console. Instead, we create an **attachment** with AWS TGW.

AWS Transit Gateway is device to which *different networks are attached* called **Attachments** i.e. to create a connection between 2 VPCs, you will create 2 attachments with the Transit Gateway. In our case, we have 2 networks: On-premises VPN Connection and AWS VPC networks. So we will be creating 2 Attachments, a VPN Attachment and a VPC attachment and we will finally define **Routes** in the **Route Table** of the AWS Transit Gateway to form a complete Site-to-Site VPN Connection.

#### Creating a Customer Gateway

As said earlier that a customer gateway is the component on our side of the VPN connection. This component is required to setup up a VPN Connection with AWS TGW. To create a Customer Gateway, go to VPC home page and click on "Customer Gateways":

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

Click on **Create Customer Gateway**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/14.png" alt="14" class="img-responsive center-block"/>
{% endif %}

Provide a useful tag name, choose the **Static Routing** option and assign the public IP address of your on-premises network. I'm on my local-machine and my machine is behind a NAT, I'll put here my public IP address. You can find your public IP address while creating a Customer Gateway by [googling what is my ip](http://bfy.tw/2mP).

#### Creating a Transit Gateway

We have the environment and Customer Gateway ready. Next, we will create the Transit Gateway: Go to VPC Dashboard in AWS Management Console, click on *Transit Gateways* and click **Create Transit Gateway**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/1.png" alt="1" class="img-responsive center-block"/>
{% endif %}

Provide a useful name, a description and leave rest as default then click *Create Transit Gateway*:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/2.png" alt="2" class="img-responsive center-block"/>
{% endif %}

Now Transit Gateway is ready. A default Route Table with a Route has been created for you when we created the Transit Gateway since we have left the rest of the details as default. Next, we need to create **Attachments** to this Transit Gateway device. Remember that we need 2 attachments in our case: A **VPC Attachment** where our EC2 resides and the **VPN Attachment** that we will configuring to securely connect to the EC2.

#### Creating a VPC Attachment

Go to "Transit Gateway Attachments" in Transit Gatways section of the VPC Dashboard and click *Create Transit Gateway Attachment*:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/3.png" alt="3" class="img-responsive center-block"/>
{% endif %}

Choose the ID of the Transit Gateway that we just created with the "Attachment Type" of "VPC" and provide tag name:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

Select the VPC ID on the same page that is created with Terraform script and the subnet which is only one subnet on our case and click **Create Attachment**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/5.png" alt="5" class="img-responsive center-block"/>
{% endif %}

Now we have VPC Transit Gateway Attachment ready, let's create VPN Connection attachment.

#### Creating a VPN Attachment

Go to *Create Transit Gateway Attachment* section of the VPC Dashboard and click *Create Attachment*, choose the **same Transit Gateway ID** that we used while creating the VPC Attachment with the "Attachment Type" of "VPN". This time it will ask for a Customer Gateway, choose the Customer Gateway we created previously, choose the **Static** *Routing Options*, leave the rest as default and click **Create Attachment**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/6.png" alt="6" class="img-responsive center-block"/>
{% endif %}

The VPN Attachment will start provisioning. After a short time, when VPN Attachment **State** becomes **Available**, we can say that VPN attachment has been made successfully with AWS Transit Gateway:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/7.png" alt="7" class="img-responsive center-block"/>
{% endif %}

#### Creating Routes for Transit Gateway

When both VPC and VPN attachment are created, we need to configure **Routes** for both attachments so the TGW knows where to send traffic when traffic arrives from an attachment. Routes are created in **Transit Gateway Route Tables**. Remember that a default Route Table was created for us. This is because we'd allowed a default Route Table to be created when we were provisioning the Transit Gateway. To create a Route, go to *Transit Gateway Route Tables* section of the Transit Gateway in the VPC Dashboard where you will find a default Route Table. Go to **Routes** section of the Route Table and click **Create Route**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/8.png" alt="8" class="img-responsive center-block"/>
{% endif %}

Enter the CIDR IP Prefix of your local-machine. My local-machine has `192.168.0.0/16` CIDR Prefix (that is the same way we do when creating a VPN Connection with a Virtual Private Gateway). You can find your own by running:

```bash
hostname -I
```
Choose the **VPN Attachment** that we just created and click **Create Route**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/9.png" alt="9" class="img-responsive center-block"/>
{% endif %}

When the routes are created with the Transit Gateway, we need to change the **VPC**'s Route Table where the EC2 resides. To do this, go to Route Table section of the VPC Dashboard, select Route Table attached with the EC2 subnet, select the **Routes** section and click **Edit Routes**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/10.png" alt="10" class="img-responsive center-block"/>
{% endif %}

Choose the *Destination* as `0.0.0.0/0` and *Target* as the **Transit Gateway** that we created at the beginning:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/11.png" alt="11" class="img-responsive center-block"/>
{% endif %}

Once VPC Route Table is updated to the Transit Gateway. Finally we will setup our network using Strongswan to establish the VPN connection.

### Configuring the VPN Connection with the Strongswan

In the *Virtual Private Network* section of the VPC Dashboard, choose the Site-to-Site VPN Connection that is created with the **VPN Attachment** and click on Download Configuration:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/12.png" alt="12" class="img-responsive center-block"/>
{% endif %}

Choose **Vendor** as **Strongswan**, leave the rest as default and click Download:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/13.png" alt="13" class="img-responsive center-block"/>
{% endif %}

You will get a VPN Connection configuration file. This file contains the IP Address of the VPN Tunnel and Pre-Shared Keys (With other information about the VPN Connection) which are required to establish a VPN Connection.

To setup or test a Site-to-Site VPN connection between the 2 networks, we need access to Network Routers and Firewalls. Since we have setup all the VPN Connection related stuff in AWS Management Console and we have got the configuration file from AWS side, we need to configure the VPN Connection on our side of the network using the configuration that we have. Such configurations are usually carried out by Network Administrators when we provide them the configuration file. We will use a software-based appliance called **Strongswan** on our local-machine to establish a VPN connection with the remote network in AWS.

We will be configuring the VPN Connection using Strongswan running inside a Docker Container. I have created a `docker-compose.yml` file for you in the aws-vpn-docker [repository](https://github.com/kjanshair/aws-vpn-docker) which has Strongswan pre-configured. The `docker-compose.yml` file is:-

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

Information about the Tunnel Configurations and Pre-Shared Keys are already mentioned in the configuration file. You simply need to put *related* **Tunnel Configuration Details** and **Pre-Shared Keys** from the file to the respective files in **conf** directory of the repository and run `docker-compose up -d` to start the container and establish the VPN connection. Once your connection has been established. Run:

```bash
ssh ubuntu@10.0.xx.xxx
```

To SSH into the EC2 via it's private IP address.

----------------
### Conclusion

AWS Transit Gateway is modern approach to centrally manage network connections. AWS TGW also allows **Cross-Account** network connections. It is important to remember the AWS TGW connection and bandwidth limitations which you can find more about [here](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-limits.html) and about [pricing](https://aws.amazon.com/transit-gateway/pricing/).

Configurations related to software-based appliences such as Strongswan vary from AWS region-to-region.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}