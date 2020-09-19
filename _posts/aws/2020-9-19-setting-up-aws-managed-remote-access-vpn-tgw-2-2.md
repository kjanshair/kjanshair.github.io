---
layout:     post
title:      "Setting up AWS Managed Remote Access VPN: Transit Gateway"
date:       2020-09-19
comments: true
author:     "Janshair Khan"
color: "#F69400"
---

In the last [post](https://kjanshair.github.io/2020/09/18/setting-up-aws-managed-remote-access-vpn-vpg-1-2/), we saw how to setup a Remote Access VPN connection between the on-premises and the AWS VPC networks. In this post, we will setup the Remote Access VPN connection with a more robust approach that is by using **AWS Transit Gateway**.

#### The Problem!
Previously, we have been using *Virtual Private Gateways* and *VPC Peering Connections* in AWS to configure various network connections between the on-premises and AWS networks. As the number of connections grow, managing these Virtual Private Gateways & Peering Connections becomes a difficult task and we end up with scattered information forming **Meshes** of different on-premises and AWS networks. For instance, if we have to peer 5 VPCs in AWS, we end up with 10 VPC Peering Connections and it becomes even more handy when we have more networks to deal with that is spanned across on-premises and multi-account AWS networks.

#### Introducing AWS Transit Gateway
AWS Transit Gateway (TGW) mitigates the above problem by allowing us to **centrally manage** all network connections and routing. Transit Gateway helps prevent forming the network mesh. Transit Gateway is fully managed and scalable network solution from AWS.

> You can find more on in the [FAQs](https://aws.amazon.com/transit-gateway/faqs/) of the Transit Gateway.

### Setting up the environment
In this lab environment have the same environment with a VPC with a private subnet, a route table attached to that subnet and a Linux EC2 instance without any associated public IP address. We will be SSHing into the EC2 instance via the private IP address through the AWS Remote Access VPN tunnel.

I have a Terraform [script](https://github.com/kjanshair/aws-vpn-docker) (under the **"init"** directory) that you can use to setup the environment in on go. To execute the script, run:

```bash
terraform init
```

```bash
terraform apply -var-file=input.tfvars -auto-approve
```

> Modify `input.tfvars` accordingly if you are following along. Also keep in mind that all the AWS resources we will be provisioning may cost you some cents. Make sure you delete them if they are no longer required.

Once the script is executed, you will see a VPC has been created with a private subnet, a route table and an EC2 without the public IP address. The script creates one subnet in one Availability Zone for demonstration purpose.

Once the environment is ready, let's start creating a Remote Access VPN connection with AWS Transit Gateway.

### Setting up a Remote Access VPN Connection using AWS Transit Gateway

This time, we will be setting up the VPN connection using Transit Gateway (TGW). With Transit Gateway, we don't have to explicitly provision a Virtual Private Gateway and a VPN connection. Instead, we create **attachments** with Transit Gateway.

#### Transit Gateway Attachments

Think of the Transit Gateway as a software device to which *different networks are attached* called **Attachments**. For instance, to create a connection between 2 VPCs, you will create 2 attachments with the Transit Gateway. In our case, we have 2 networks: On-premises and the AWS VPC network. So we will be creating 2 attachments: A VPN Attachment and a VPC Attachment. We will finally define **Routes** in the **Route Table** of the Transit Gateway to form the VPN connection.

#### Creating a Customer Gateway

As said earlier that a customer gateway is the component that represents our network side of the VPN connection which is the required. To create a Customer Gateway, go to VPC home page and click on "Customer Gateways":

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-vpg-1-2/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

Click on **Create Customer Gateway**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/14.png" alt="14" class="img-responsive center-block"/>
{% endif %}

Provide a useful tag name, choose the **Static Routing** option and assign the public IP address of your on-premises network. I'm on my local-machine and my machine is behind a NAT, I'll put here my public IP address. You can find your public IP address by [googling what is my ip](http://bfy.tw/2mP).

#### Creating a Transit Gateway

We already have the VPC and the Customer Gateway. Now we will be creating the Transit Gateway.

Go to VPC Dashboard in AWS Management Console, click on *Transit Gateways* and click **Create Transit Gateway**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/1.png" alt="1" class="img-responsive center-block"/>
{% endif %}

Put a name, a description and you can leave rest of the options default and click *Create Transit Gateway*:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/2.png" alt="2" class="img-responsive center-block"/>
{% endif %}

Now Transit Gateway is ready. A default Route Table (with one Route) has been created for you when we provision the Transit Gateway as we have left the rest of the options default. Next we need to create **Attachments**. As said, we need 2 attachments: A **VPC Attachment** where our EC2 resides and the **VPN Attachment** that we will configuring to securely connect to the EC2 through the tunnel.

#### VPC Attachment

Go to "Transit Gateway Attachments" in Transit Gateways section of the VPC Dashboard and click *Create Transit Gateway Attachment*:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/3.png" alt="3" class="img-responsive center-block"/>
{% endif %}

Choose the ID of the Transit Gateway that we just created with the "Attachment Type" of "VPC" and provide tag name:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

Select the VPC ID on the same page that was created with the Terraform script and the private subnet and click **Create Attachment**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/5.png" alt="5" class="img-responsive center-block"/>
{% endif %}

Now we have the VPC attachment, now let's create VPN connection attachment.

#### VPN Attachment

Go to *Create Transit Gateway Attachment* section in the VPC Dashboard and click *Create Attachment*, choose the same Transit Gateway ID with the attachment type VPN. This time it will ask for a Customer Gateway, choose the Customer Gateway we created previously, choose the **Static** *Routing Options*, leave the rest as default and click **Create Attachment**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/6.png" alt="6" class="img-responsive center-block"/>
{% endif %}

The VPN Attachment will start provisioning. After a short time, when VPN Attachment **State** becomes **Available**, we assume that the VPN attachment has been made successfully with the Transit Gateway:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/7.png" alt="7" class="img-responsive center-block"/>
{% endif %}

#### Creating Routes for Transit Gateway

We need to configure **Routes** for both attachments so the Transit Gateway knows where to route network traffic when arrives from an attachment. Routes are created in **Transit Gateway Route Tables**. A default Route Table was created when we were provisioning the Transit Gateway. To create a Route, go to *Transit Gateway Route Tables* section of the Transit Gateway where you will find a default Route Table. Go to **Routes** section of the Route Table and click **Create Route**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/8.png" alt="8" class="img-responsive center-block"/>
{% endif %}

Enter the CIDR IP prefix of your local-machine. My local-machine has `192.168.0.0/16` CIDR prefix. You can find your own with:

```bash
hostname -I
```
Choose the **VPN Attachment** that we have created previously and click **Create Route**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/9.png" alt="9" class="img-responsive center-block"/>
{% endif %}

When the routes are created with the Transit Gateway, we need to change the **VPC** Route Table to allow the subnet traffic towards Transit Gateway. For this, go to VPC Route Table, select Route Table attached with the private subnet, select the **Routes** section and click **Edit Routes**:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/10.png" alt="10" class="img-responsive center-block"/>
{% endif %}

Choose the *Destination* as `0.0.0.0/0` and *Target* as the **Transit Gateway** that we have created at the beginning:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/11.png" alt="11" class="img-responsive center-block"/>
{% endif %}

Once VPC Route Table has updated. Finally we will setup our network to establish the VPN connection using Strongswan.

### Setting up the VPN tunnel with the Strongswan

In the *Virtual Private Network* section of the VPC Dashboard, choose the Site-to-Site VPN connection option that was created with the **VPN Attachment** and click on Download Configuration:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/12.png" alt="12" class="img-responsive center-block"/>
{% endif %}

Choose **Vendor** as **Strongswan**, leave the rest as default and click Download:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.blob.core.windows.net/aws/setting-up-aws-managed-s2s-vpn-tgw-2-2/13.png" alt="13" class="img-responsive center-block"/>
{% endif %}

You will get a VPN connection configuration file. This file contains the IP Address of the VPN Tunnel and Pre-Shared Keys (With other information about the VPN connection) which are required to setup the VPN connection.

To test the VPN connection between the 2 networks, we need access to our network routers and firewalls. Since we have got the configuration file from AWS Management Console, we now have to configure the VPN connection on our side of the network using the configuration that we just downloaded. Such network configurations are usually carried out by Network Administrators when we provide them the configuration file. We will use a software-based VPN appliance called **Strongswan** on our local-machine to setup the VPN connection with the AWS VPC.

We will be configuring the VPN connection using Strongswan running inside a Docker container. I have created the `docker-compose.yml` file for you in the aws-vpn-docker [repository](https://github.com/kjanshair/aws-vpn-docker) which has Strongswan pre-configured. The `docker-compose.yml` file is:-

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

Information about the Tunnel Configurations and Pre-Shared Keys are already present in the configuration file. You simply need to put *related* **Tunnel Configuration Details** and **Pre-Shared Keys** from the file to the respective files in **conf** directory and run `docker-compose up -d` to start the container and setup the VPN connection. Once the connection is ready. Try SSHing:

```bash
ssh ubuntu@10.0.xx.xxx
```

To SSH into the EC2 via it's private IP address.

----------------
### Conclusion

AWS Transit Gateway is a more robust approach to centrally manage network connections. Transit Gateway also allows **Cross-Account** network connections. It is important to remember the AWS Transit Gateway connection and bandwidth limitations which you can find more about [here](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-limits.html) and about [pricing](https://aws.amazon.com/transit-gateway/pricing/).

Configurations related to software-based appliances such as Strongswan may vary from AWS region-to-region.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}