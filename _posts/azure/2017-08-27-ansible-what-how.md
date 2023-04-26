---
layout:     post
title:      "Ansible? What? How?"
date:       2017-08-27
comments: true
author:     "Janshair Khan"
color: "#000000"
---

Now you may have gone through the Internet and still didn't get that what Ansible is and why it is used for? How it can benefit your organization and fit into your DevOps workflow? Then probably you are at the right place!

Ok let's start with a real-life example that you have been asked to provision 3 servers either on a public cloud provider such as Microsoft Azure or AWS or on-premises data center, configure each server's environment for the application, put a load-balancer over them.

Now probably the most tedious and time-consuming tasks for you while configuring these servers could be:
 - SSH into the server
 - Add runtime's PPA
 - Install the latest version of the runtime
 - Configure any other server settings such as changing host in Apache\Nginx

You have to repeat those steps for each server and suppose if those were 10 or more servers instead of 3, how painful it could be. This is where we use an Software Configuration Management (SCM) tool and one of the most popular is Red Hat's **Ansible** which we're gonna see next.

## Ansible Automation & Architecture

Ansible is an SCM tool and is used to automate repetitive tasks that is usually done on a server. Ansible SCM tool consists 3 core subsystems: **ACS (Ansible Control Server)**, **Ansible Inventory** and **Ansible Playbooks**. Before seeing a live example, it would be better to understand these Ansible terms and architecture a bit so can go with it.

At first, *ACS or Ansible Control* Server is the component which does the main configuration tasks on one or more servers. ACS server can be located on your own local machine or somewhere else on the Internet. *Ansible Inventory* (As the name suggests) is the inventory of *Servers* where ACS will perform the configuration steps and finally Ansible Playbooks are those required steps that ACS will perform on that inventory of servers. Ansible interacts with servers via SSH protocol which is a secure way of managing and configuring servers i.e. all the operations and file transfers are encrypted in every session. 

<img src="{{ site.cdnurl }}/azure/up-and-running-with-ansible-and-microsoft-azure/1.png" alt="ansible-architecture" class="img-responsive center-block"/>

As illustrated in the above image that the server are in one of the Azure region (see next), ACS interacts with the server through the Inventory file (as those servers are defined in the inventory file) and apply the configurations defined in the Playbooks. It is important to note that ACS does not use any database which makes it super light-weight to download, install and configure. Let's see an example to see Ansible in action.

> It is expected that you have installed Ansible on your machine. If you didn't, take a look at <a href="http://docs.ansible.com/ansible/latest/intro_installation.html" class="underline" target="_blank">this</a> documentation to see how to install Ansible. It's easy!

## Using Ansible

Suppose you provisioned 3 raw web servers (Virtual machines) in a cloud provider such as AWS or Microsoft Azure (In our case). While provisioning virtual machines, a public IP address will be assign to each VM so we can access them via the Internet. First we need to add these IP addresses to Ansible Inventory file.

### Adding Servers to Ansible Inventory

Ansible Inventory is a file where you describe your targeted servers. In Linux (Debian-based systems), the default location of inventory file is `/etc/ansible/hosts` directory but you can create this file somewhere else and use the `-i` flag in the Ansible CLI to specify the inventory file.

For now, we would like to use the default file location. So open-up this file in an editor and at first, you will see a lot of comments in the inventory file but try to configure your servers at the bottom of the file by creating a group of servers named `webservers` like:

```toml
[webservers]
xx.xx.xx.xx
xx.xx.xx.xx
xx.xx.xx.xx
```  

You can use groups to target a specified number of servers for configuration in Ansible. Groups are defined in `[]`. You can even create groups of groups and divide your inventory file with one or more files.

Make sure that your system's public SSH key is added to each Azure VMs as the identity mechanism as Ansible works well with SSH. If you used SSH password-based authentication, use the `-k` flag with the Ansible CLI which will ask for a SSH password while running Playbooks. Now our inventory is ready, lets create a Playbook to configure our servers.

### Creating Ansible Playbooks

Ansible Playbooks are used to configure servers to your desired-states. Playbooks are YAML files and are composed of *Playbook Modules*. Ansible Playbook Modules are **abstractions** for configuring servers. For example, for installing a Debian package via apt, there is a built-in module to do the same task as an abstracted way as we will see in a bit. There are hundreds of Ansible Modules out there for various types of configurations. Click <a href="http://docs.ansible.com/ansible/latest/modules_intro.html" class="underline" target="_blank">here</a> to learn more about Ansible Modules.

So, what we want from Ansible simply now is to:

- Install latest Docker Engine on each server using PPA
- Add the current user to the **docker** group so it can run docker commands without *sudo* prefix on each server

This is a super simple illustration of the how Ansible Playbooks works. The Playbook YAML file for this is given below:

```yaml
---
- hosts: all
  become: true

  tasks:
    - name: ensure repository key is installed
      apt_key:
        id: "58118E89F3A912897C070ADBF76221572C52609D"
        keyserver: "hkp://p80.pool.sks-keyservers.net:80"
        state: present

    - name: ensure docker registry is available
      apt_repository: repo='deb https://apt.dockerproject.org/repo ubuntu-xenial main' state=present

    - name: ensure docker and dependencies are installed
      apt: name=docker-engine update_cache=yes

    - service: name=docker state=restarted

    - name: get current username
      command: whoami
      register: local_username
      become: false

    - name: Adding user {{local_username.stdout}}  
      user: name={{local_username.stdout}}
            group=docker
            shell=/bin/bash
            groups=docker
            append=yes
``` 

Copy and save this file with a name (such as docker.yml) and that's it. Now our Ansible Inventory and Playbook are ready. Next, we need to tell ACS Server to start configuring the server.

### Running ACS Server

Finally, open-up the terminal at the directory containing your Playbook and run the command: `ansible-playbook docker.yml`. This command will install Docker Community Edition and will add the current user to the *docker* group on each Azure VM. You don't have to manually SSH into each server, add PPA, run `apt` command etc and everything will be done for you by the ACS server. A true Automation Tool.

## Conclusions
Well, there is a lot to cover regarding Ansible such as managing Ansible Playbooks with Ansible Roles, sharing to Galaxy, creating your own Ansible Modules etc to master Ansible. We may look at them in some future post. This is a super basic example of up and running with Ansible. There are also other SCM tools available, some popular of them are Chef, Puppet, SaltStack, PowerShell DSC and others. But in the last couple of months, Ansible got huge amount of attention due to its simplicity, speed and huge online community.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}
