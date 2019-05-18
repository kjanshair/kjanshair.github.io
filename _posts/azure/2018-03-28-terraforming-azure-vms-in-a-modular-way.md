---
layout:     post
title:      "Terraforming Azure Virtual Machines in a modular way"
date:       2018-03-28
comments: true
author:     "Janshair Khan"
color: "#594CDE"
---

## What is a Terraform Module?

A Terraform module is a Terraform Configuration file ending with `.tf` extension that we can reuse and apply without repeating the configurations and can share the configuration files in the form of modules with other people so they can reuse that module. Terraform modules are like functions in a programming language where we turn a code block into a function and call it with custom arguments whenever we need for re-usability.

You either write a Terraform module yourself to meet your business requirements or you can use modules published and maintained by the community at <a href="https://registry.terraform.io/" class="underline" target="_blank">Terraform Registry</a>.

## What we will see here?

We will use Terraform Azure Resource Manager provider to provision:

- An Azure Virtual Network with a single subnet and a Network Security Group attached to that subnet 
- 3 Linux Virtual Machines with Debian 9 OS image inside an Availability Set
- Provision a Azure L4 Load Balancer in the front of those Linux Virtal Machines

We won't take a look at how to create your own custom modules here. We will use more than one module from Terraform Registry for a number of Azure Resources to avoid reinventing the wheel by re-writing those modules and will use a custom module that I have <a href="https://registry.terraform.io/modules/kjanshair/virtual-machines/azurerm" class="underline" target="_blank">published</a> to Terraform Registry used for Provisioning Linux Virtual Machines. 

## Setting up the workspace

We will use a single Terraform configuration file called `resources.tf`. Create this file in an empty folder and configure the Azure Provider via Azure Service Principal in the file as shown below:

```hcl
# Configure Azure Provider

variable "subscription_id"{}
variable "client_id"{}
variable "client_secret"{}
variable "tenant_id"{}

provider "azurerm"{
    subscription_id = "${var.subscription_id}"
    client_id       = "${var.client_id}"
    client_secret   = "${var.client_secret}"
    tenant_id       = "${var.tenant_id}"
}

```

I have set the required Environment Variables to let the Terraform extract the values for these variables from Environment Variables. This is why I did not specify them those values explicitly in the configuration file.

> Click <a href="https://www.terraform.io/docs/providers/azurerm/authenticating_via_service_principal.html" class="underline" target="_blank">here</a>, if you don't know how to configure Azure Service Principal to allow Terraform to modify your Azure resources in your subscription.

Let's add our first Azure resource by continuing editing the file as:

```hcl
...
...

resource "azurerm_resource_group" "resource_group"{
    name     = "TerraformDemoRG"
    location = "West US"
}
```

This will create a Resource Group named "TerraformDemoRG" in the "West US" region. This is the resource group and the region that we will use to provision all of our resources.

Next create an Azure Virtual Network that we'll be using for our Virtual Machines. This is where we will use our first Terraform module:

```hcl
...
...

module "VirtualNetwork"{
    source = "Azure/network/azurerm"
    resource_group_name = "${azurerm_resource_group.resource_group.name}"
    location            = "${azurerm_resource_group.resource_group.location}"
    vnet_name           = "TerraformVNet"
    address_space       = "10.0.0.0/16"
    subnet_prefixes     = ["10.0.0.0/16"]
    subnet_names        = ["default"]
}

```

Here we are creating a Virtual Network named `TerraformVNet` with a single subnet named `default`. A module in Terraform is defined using the `module` keyword and a name of the module. The name could be anything. Inside the body of the module, we use the `source` attribute of the module to refer to the actual module location. If the module is located on a remote location (i.e. Terraform Registry in this case), we will use the syntax `<author-name>/<module-name>/<provider>` (as shown here) or if the module is located on the local file-system of the machine, we will refer to the absolute path of the module in the file-system. We can also use a `version` attribute to refer a specific version of the module as they are versioned control in Github.

As you can see here that we are borrowing the `resource_group_name` and `location` attributes from the `azurerm_resource_group` section for `VirtualNetwork` module. This way we are using a single point for region and resource group name for all of our resources.

Next we need to define the subnet configurations and Network Security Group setting as:

```hcl
...
...

resource "azurerm_subnet" "subnet"{
  name  = "default"
  address_prefix = "10.0.0.0/16"
  resource_group_name = "${azurerm_resource_group.resource_group.name}"
  virtual_network_name = "${module.VirtualNetwork.vnet_name}"
  network_security_group_id = "${module.NetworkSecurityGroup.network_security_group_id}"
}

module "NetworkSecurityGroup"{
    source = "Azure/network-security-group/azurerm"
    resource_group_name        = "${azurerm_resource_group.resource_group.name}"
    location                   = "${azurerm_resource_group.resource_group.location}"
    security_group_name        = "Terraform-NSG"

    predefined_rules           = [
      {
        name                   = "SSH"
        priority               = "1001"
        source_address_prefix  = ["*"]
      },
      {
        name                   = "HTTP"
        priority               = "1002"
        source_address_prefix  = ["*"]
      }
    ]
}

```

Here we are using another module from Terraform Registry called `NetworkSecurityGroup` which is used to create a Network Security Group (NSG). With this module, we create a custom NSG with some predefined rules such as SSH and HTTP. We can also use custom inbound\outbound rules with this module that you can learn more about from the module documentations <a href="https://registry.terraform.io/modules/Azure/network-security-group/azurerm/" class="underline" target="_blank">here</a>.

We are also attaching the newly created NSG to the `default` subnet inside the `VirtualNetwork` module via the `network_security_group_id` variable as shown above.

Next we need to provision an Azure Load Balancer. There is also a module for creating an Azure Load Balancer on the Terraform Registry that we used here as:

```hcl
...
...

module "LoadBalancer"{
    source = "Azure/loadbalancer/azurerm"
    type    =   "public"
    "lb_port" {
        HTTP = ["80", "Tcp", "80"]
    }
    frontend_name   =   "${azurerm_resource_group.resource_group.name}-frontend"
    prefix        =   "${azurerm_resource_group.resource_group.name}"
    resource_group_name = "${azurerm_resource_group.resource_group.name}"
    location            = "${azurerm_resource_group.resource_group.location}"
    public_ip_address_allocation    =   "static"
}
```

We used a module for creating an Azure Load Balancer refer here as `LoadBalancer`. We defined the `type` as `public` since it is a public Internet facing load balancer and will distribute traffic coming from the Internet to individual VMs and defined the HealthProbe port as 80. With the HealthProbe approach, the load balancer will check the health status of each back-end virtual machine through the port 80. If, somehow, there is no service running on port 80 inside a VM, the Load Balancer will not send any traffic to that back-end machine as the Load-Balancer will consider it unhealthy. For production use cases, you may use an application end point which provides the health status to the load balancer about the instance. You can learn more about the Azure Load Balancer module <a href="https://registry.terraform.io/modules/Azure/loadbalancer/azurerm/" class="underline" target="_blank">here</a>.

Finally we will use another module from the Terraform Registry that I have created for provisioning one or more Linux Virtual Machines as:

```hcl
...
...

module "VirtualMachines"{
    source = "kjanshair/virtual-machines/azurerm"
    nsg_id = "${module.NetworkSecurityGroup.network_security_group_id}"
    subnet_id = "${azurerm_subnet.subnet.id}"
    resource_group = "${azurerm_resource_group.resource_group.name}"
    location            = "${azurerm_resource_group.resource_group.location}"
    nb_instances         =   2
    update_domain_count     =   2
    fault_domain_count      =   2
    availability_set_name   =   "TerraformAS"
    vm_sizes    =   "Standard_DS1_v2"
    host_names      =   ["host0", "host1"]
    private_ip_addresses      =   ["10.0.1.0", "10.0.2.0"]
    backend_address_pools_ids         = ["${module.LoadBalancer.azurerm_lb_backend_address_pool_id}"]
    ssh_key = "${file("~/.ssh/id_rsa.pub")}"
}

```

There are a number of attributes here that you use to customize the Virtual Machine(s) provisioning to meet your needs. You can learn about all the Inputs\Outputs of the module on the documentation section <a href="https://registry.terraform.io/modules/kjanshair/virtual-machines/azurerm/" class="underline" target="_blank">here</a>.

Here we are creating 2 Linux VMs inside an Availability Set named `TerraformAS` and behind the Azure Load Balancer. Each Linux VM has the same user name and the host name as defined in the `host_names` list variable i.e. first VM has the SSH user and machine name is `host0` and `host1` for the second VM respectively. Same works in case of `private_ip_addresses` as shown above. We use the `backend_address_pools_ids` to attach each VM to Azure Load Balancer as back-end. Finally set `ssh_key` by the value of your public SSH key that you want to use for each Virtual Machine in the Availability Set. The complete `resources.tf` file is:

```hcl
module "VirtualNetwork"{
    source = "Azure/network/azurerm"
    resource_group_name = "${azurerm_resource_group.resource_group.name}"
    location            = "${azurerm_resource_group.resource_group.location}"
    vnet_name           = "TerraformVNet"
    address_space       = "10.0.0.0/16"
    subnet_prefixes     = ["10.0.0.0/16"]
    subnet_names        = ["default"]
}

resource "azurerm_subnet" "subnet"{
  name  = "default"
  address_prefix = "10.0.0.0/16"
  resource_group_name = "${azurerm_resource_group.resource_group.name}"
  virtual_network_name = "${module.VirtualNetwork.vnet_name}"
  network_security_group_id = "${module.NetworkSecurityGroup.network_security_group_id}"
}

module "NetworkSecurityGroup"{
    source = "Azure/network-security-group/azurerm"
    resource_group_name        = "${azurerm_resource_group.resource_group.name}"
    location                   = "${azurerm_resource_group.resource_group.location}"
    security_group_name        = "Terraform-NSG"

    predefined_rules           = [
      {
        name                   = "SSH"
        priority               = "1001"
        source_address_prefix  = ["*"]
      },
      {
        name                   = "HTTP"
        priority               = "1002"
        source_address_prefix  = ["*"]
      }
    ]
}

module "LoadBalancer"{
    source = "Azure/loadbalancer/azurerm"
    type    =   "public"
    "lb_port" {
        HTTP = ["80", "Tcp", "80"]
    }
    frontend_name   =   "${azurerm_resource_group.resource_group.name}-frontend"
    prefix        =   "${azurerm_resource_group.resource_group.name}"
    resource_group_name = "${azurerm_resource_group.resource_group.name}"
    location            = "${azurerm_resource_group.resource_group.location}"
    public_ip_address_allocation    =   "static"
}

module "VirtualMachine"{
    source = "kjanshair/virtual-machines/azurerm"
    nsg_id = "${module.NetworkSecurityGroup.network_security_group_id}"
    subnet_id = "${azurerm_subnet.subnet.id}"
    resource_group = "${azurerm_resource_group.resource_group.name}"
    location = "${azurerm_resource_group.resource_group.location}"
    nb_instances = 2
    update_domain_count = 2
    fault_domain_count = 2
    availability_set_name = "TerraformAS"
    vm_sizes = "Standard_DS1_v2"
    host_names = ["host0", "host1"]
    private_ip_addresses = ["10.0.1.0", "10.0.2.0"]
    backend_address_pools_ids = ["${module.LoadBalancer.azurerm_lb_backend_address_pool_id}"]
    ssh_key = "${file("~/.ssh/id_rsa.pub")}"
}
```

Save the file and run the command `terraform init` to download the required modules from Terraform Registry, run `terraform validate` and `terraform plan` to validate your configuration file and test what will be provisioned on your Azure subscription before running `terraform apply`. Finally run `terraform apply` to start provisioning and using your resources.

## Conclusion

Here we saw how to re-use Terraform modules developed and maintained by the community to meetup our needs. Terraform modules reduce configuration conflicts and promote reusability. There are a number of open-source and freely available Terraform modules for a number of providers on the Terraform Registry that you can download and customize to suit your business needs.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}